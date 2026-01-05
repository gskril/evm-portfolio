import type { Context } from 'hono'
import { zeroAddress } from 'viem'
import { z } from 'zod'

import { db } from '../db'
import { erc20Queue } from '../queues/workers/erc20'
import { ethQueue } from '../queues/workers/eth'

export async function addCheckBalanceTasksToQueue() {
  const accounts = await db.selectFrom('accounts').selectAll().execute()
  const tokens = await db.selectFrom('tokens').selectAll().execute()

  const balancesOfOffchainAccounts = await db
    .selectFrom('balances')
    .selectAll()
    .where(
      'owner',
      'in',
      accounts.filter((a) => a.address === null).map((a) => a.id)
    )
    .execute()

  const ethTasks = []
  const erc20Tasks = []

  for (const account of accounts) {
    for (const token of tokens) {
      // Handle offchain accounts
      if (account.address === null) {
        const balance = balancesOfOffchainAccounts.find(
          (b) => b.owner === account.id && b.token === token.id
        )

        // We'll run into an error later if we don't have a balance for an offchain account,
        // so we'll just not add it to the queue in the first place.
        if (!balance) {
          continue
        }
      }

      if (token.address === zeroAddress) {
        // Native ETH
        ethTasks.push({
          owner: account,
          chainId: token.chain,
        })
      } else {
        // ERC20s
        erc20Tasks.push({
          token: token.address,
          owner: account,
          chainId: token.chain,
        })
      }
    }
  }

  await ethQueue.addBulk(
    ethTasks.map((task) => ({
      name: `${task.chainId}:${task.owner.id}`,
      data: task,
    }))
  )

  await erc20Queue.addBulk(
    erc20Tasks.map((task) => ({
      name: `${task.chainId}:${task.owner.id}:${task.token}`,
      data: task,
    }))
  )
}

export async function fetchBalances(c: Context) {
  await addCheckBalanceTasksToQueue()
  return c.json({ success: true })
}

export async function getBalances(c: Context) {
  const { balances, accountBalances, tokens, chains, accounts } = await db
    .transaction()
    .execute(async (trx) => {
      // Get all balances, grouped by token (address + chain)
      const balances = (await trx
        .selectFrom('balances')
        .select([
          'token',
          trx.fn.sum('balance').as('balance'),
          trx.fn.sum('ethValue').as('ethValue'),
        ])
        .where('balance', '>', 0)
        .groupBy(['token'])
        .orderBy('ethValue', 'desc')
        .execute()) as {
        // For some reason kysely infers `balance` and `ethValue` incorrectly
        token: number
        balance: number
        ethValue: number
      }[]

      // Get all balances with owner information (not aggregated)
      const accountBalances = await trx
        .selectFrom('balances')
        .select(['token', 'owner', 'balance', 'ethValue'])
        .where('balance', '>', 0)
        .execute()

      const tokens = await trx
        .selectFrom('tokens')
        .selectAll()
        .where(
          'id',
          'in',
          balances.map((b) => b.token)
        )
        .execute()

      const chains = await trx.selectFrom('chains').selectAll().execute()

      const accounts = await trx
        .selectFrom('accounts')
        .select(['id', 'name', 'address'])
        .execute()

      return { balances, accountBalances, tokens, chains, accounts }
    })

  const tokensWithChain = tokens.map((t) => ({
    ...t,
    chain: chains.find((c) => c.id === t.chain)!,
  }))

  const enhancedBalances = balances.map((b) => {
    // Get account breakdown for this token
    const accountsForToken = accountBalances
      .filter((ab) => ab.token === b.token)
      .map((ab) => ({
        account: accounts.find((a) => a.id === ab.owner)!,
        balance: ab.balance,
        ethValue: ab.ethValue,
        percentage: (ab.balance / b.balance) * 100,
      }))
      .sort((a, b) => b.balance - a.balance)

    return {
      balance: b.balance,
      ethValue: b.ethValue,
      ethValuePerToken: b.ethValue / b.balance,
      accountBreakdown: accountsForToken,
      ...tokensWithChain.find((t) => t.id === b.token)!,
    }
  })

  // Note: this isn't technically precise because different tokens could have
  // the same address on different chains, but i've never seen that happen in
  // practice, so I'd rather optimize for UX by combining stuff like (W)ETH
  // across chains. Worst case, the totalEthValue will still be accurate
  // (I think) just with a slightly different breakdown.
  // const combinedBalances = enhancedBalances.reduce(
  //   (acc, balance) => {
  //     const existing = acc.find((b) => b.address === balance.address)
  //     if (existing) {
  //       existing.balance += balance.balance
  //       existing.ethValue += balance.ethValue
  //     } else {
  //       acc.push({ ...balance })
  //     }
  //     return acc
  //   },
  //   [] as typeof enhancedBalances
  // )

  const totalEthValue = enhancedBalances.reduce((acc, b) => acc + b.ethValue, 0)
  return c.json({ totalEthValue, tokens: enhancedBalances })
}

export async function getEthValueByAccount(c: Context) {
  const { balances, accounts } = await db.transaction().execute(async (trx) => {
    const balances = await trx
      .selectFrom('balances')
      .select(['owner', db.fn.sum('ethValue').as('ethValue')])
      .where('ethValue', '>', 0)
      .groupBy(['owner'])
      .orderBy('ethValue', 'desc')
      .execute()

    const accounts = await trx
      .selectFrom('accounts')
      .select(['id', 'address', 'name'])
      .where(
        'id',
        'in',
        balances.map((b) => b.owner)
      )
      .execute()

    return { balances, accounts }
  })

  const data = balances.map((b) => ({
    ethValue: Number(b.ethValue),
    owner: accounts.find((a) => a.id === b.owner)!,
  }))

  return c.json(data)
}

export async function getNetworthTimeSeries(c: Context) {
  const networth = await db
    .selectFrom('networth')
    .selectAll()
    .limit(60)
    .orderBy('timestamp', 'desc')
    .execute()

  return c.json(networth.reverse())
}

export async function getOffchainBalances(c: Context) {
  const { accounts, balances, tokens } = await db
    .transaction()
    .execute(async (trx) => {
      const accounts = await trx
        .selectFrom('accounts')
        .selectAll()
        .where('address', 'is', null)
        .execute()

      const balances = await trx
        .selectFrom('balances')
        .selectAll()
        .where(
          'owner',
          'in',
          accounts.map((a) => a.id)
        )
        .execute()

      const tokens = await trx
        .selectFrom('tokens')
        .selectAll()
        .where(
          'id',
          'in',
          balances.map((b) => b.token)
        )
        .execute()

      return { accounts, balances, tokens }
    })

  const enhancedBalances = balances.map((b) => ({
    ...b,
    owner: accounts.find((a) => a.id === b.owner)!,
    token: tokens.find((t) => t.id === b.token)!,
  }))

  return c.json(enhancedBalances)
}

const editOffchainAccountSchema = z.object({
  account: z.number(),
  token: z.number(),
  amount: z.number(),
})

export async function editOffchainBalance(c: Context) {
  const safeParse = editOffchainAccountSchema.safeParse(await c.req.json())

  if (!safeParse.success) {
    return c.json({ error: safeParse.error }, 400)
  }

  const { account, token, amount } = safeParse.data

  const realAccount = await db
    .selectFrom('accounts')
    .selectAll()
    .where('id', '=', account)
    .executeTakeFirst()

  if (!realAccount || !!realAccount.address) {
    return c.json({ error: 'Cannot edit balances for onchain accounts' }, 400)
  }

  await db
    .insertInto('balances')
    .values({
      token,
      owner: account,
      balance: amount,
      ethValue: 0,
    })
    .onConflict((oc) => oc.doUpdateSet({ balance: amount, ethValue: 0 }))
    .execute()

  return c.json({ success: true })
}

const deleteOffchainBalanceSchema = z.object({
  account: z.coerce.number(),
  token: z.coerce.number(),
})

export async function deleteOffchainBalance(c: Context) {
  const safeParse = deleteOffchainBalanceSchema.safeParse(await c.req.json())

  if (!safeParse.success) {
    return c.json({ error: safeParse.error }, 400)
  }

  await db
    .deleteFrom('balances')
    .where('owner', '=', safeParse.data.account)
    .where('token', '=', safeParse.data.token)
    .execute()

  return c.json({ success: true })
}
