import type { Context } from 'hono'
import type { Transaction } from 'kysely'
import { isAddress } from 'viem'
import { z } from 'zod'

import { getViemClient } from '../chains'
import { type Tables, db } from '../db'
import { truncateAddress } from '../utils'

const getAccountsSchema = z.object({
  type: z.enum(['onchain', 'offchain']).optional(),
})

const tagSchema = z
  .string()
  .trim()
  .min(1)
  .max(32)
  .regex(/^[a-zA-Z0-9][a-zA-Z0-9 _-]*$/, {
    message:
      'Tags may only contain letters, numbers, spaces, hyphens, and underscores',
  })

const tagsSchema = z
  .array(tagSchema)
  .max(20)
  .transform((tags) => [...new Set(tags.map((tag) => tag.toLowerCase()))])

export async function getAccounts(c: Context) {
  const safeParse = getAccountsSchema.safeParse(c.req.query())

  if (!safeParse.success) {
    throw new Error('Invalid query parameters')
  }

  const { type } = safeParse.data

  let accounts

  switch (type) {
    case 'onchain':
      accounts = await db
        .selectFrom('accounts')
        .selectAll()
        .where('address', 'is not', null)
        .execute()
      break
    case 'offchain':
      accounts = await db
        .selectFrom('accounts')
        .selectAll()
        .where('address', 'is', null)
        .execute()
      break
    default:
      accounts = await db.selectFrom('accounts').selectAll().execute()
  }

  const accountTags = await db.selectFrom('accountTags').selectAll().execute()

  return c.json(
    accounts.map((account) => ({
      ...account,
      tags: accountTags
        .filter((accountTag) => accountTag.accountId === account.id)
        .map((accountTag) => accountTag.tag)
        .sort(),
    }))
  )
}

// Maybe will be relevant in the future but we don't need it right now
// export async function getAccount(c: Context<BlankEnv, '/accounts/:address'>) {
//   const address = c.req.param('address')

//   if (!isAddress(address)) {
//     return c.json({ error: 'Invalid address' }, 400)
//   }

//   const account = await db
//     .selectFrom('accounts')
//     .selectAll()
//     .where('address', '=', address)
//     .executeTakeFirst()

//   if (!account) {
//     return c.json({ error: 'Account not found' }, 404)
//   }

//   return c.json(account)
// }

const addAccountSchema = z.object({
  id: z.coerce.number().int().positive().optional(),
  addressOrName: z.string().optional(),
  name: z.string().optional(),
  description: z.string().optional(),
  tags: tagsSchema.optional().default([]),
})

async function replaceAccountTags(
  trx: Transaction<Tables>,
  accountId: number,
  tags: string[]
) {
  await trx
    .deleteFrom('accountTags')
    .where('accountId', '=', accountId)
    .execute()

  if (tags.length > 0) {
    await trx
      .insertInto('accountTags')
      .values(tags.map((tag) => ({ accountId, tag })))
      .execute()
  }
}

export async function addAccount(c: Context) {
  const body = await c.req.json()
  const safeParse = addAccountSchema.safeParse(body)

  if (!safeParse.success) {
    return c.json({ error: safeParse.error }, 400)
  }

  const { id, description, tags } = safeParse.data
  let { addressOrName, name } = safeParse.data

  if (!addressOrName && !name) {
    return c.json(
      { error: 'At least one of `addressOrName` or `name` is required' },
      400
    )
  }

  if (id) {
    const account = await db
      .selectFrom('accounts')
      .select('id')
      .where('id', '=', id)
      .executeTakeFirst()

    if (!account) {
      return c.json({ error: 'Account not found' }, 404)
    }

    if (!name) {
      return c.json({ error: 'Name is required when editing an account' }, 400)
    }

    await db.transaction().execute(async (trx) => {
      await trx
        .updateTable('accounts')
        .set({ name, description })
        .where('id', '=', id)
        .execute()

      await replaceAccountTags(trx, id, tags)
    })

    return c.json({ success: true })
  }

  // Handle offchain accounts
  if (!addressOrName) {
    await db.transaction().execute(async (trx) => {
      const account = await trx
        .insertInto('accounts')
        .values({
          name: name!,
          description,
        })
        .returning('id')
        .executeTakeFirstOrThrow()

      await replaceAccountTags(trx, account.id, tags)
    })

    return c.json({ success: true })
  }

  if (!isAddress(addressOrName)) {
    const client = await getViemClient(1)
    const ensAddress = await client.getEnsAddress({ name: addressOrName })

    if (ensAddress) {
      if (!name) {
        name = addressOrName
      }

      addressOrName = ensAddress
    } else {
      return c.json({ error: 'Invalid address or ENS name' }, 400)
    }
  }

  if (!isAddress(addressOrName)) {
    // This should be unreachable and is mainly a formality for TypeScript
    return c.json({ error: 'Error resolving ENS name' }, 400)
  }

  const data = {
    address: addressOrName,
    name: name ?? truncateAddress(addressOrName),
    description,
  }

  // If the address is not null, we should prevent duplicates. But technically
  // the address can't be marked as unique in the db schema because it's
  // possible to have a null address.
  const existingAddress = await db
    .selectFrom('accounts')
    .select('id')
    .where('address', '=', addressOrName)
    .executeTakeFirst()

  if (existingAddress) {
    return c.json({ error: 'Account already exists' }, 400)
  }

  await db.transaction().execute(async (trx) => {
    const account = await trx
      .insertInto('accounts')
      .values(data)
      .returning('id')
      .executeTakeFirstOrThrow()

    await replaceAccountTags(trx, account.id, tags)
  })

  return c.json({ success: true })
}

export async function deleteAccount(c: Context) {
  const id = c.req.param('id')
  const safeParse = z.coerce.number().safeParse(id)

  if (!safeParse.success) {
    return c.json({ error: 'Invalid account ID' }, 400)
  }

  await db.deleteFrom('accounts').where('id', '=', safeParse.data).execute()
  return c.json({ success: true })
}
