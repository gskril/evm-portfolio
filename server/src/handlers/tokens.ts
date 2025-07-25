import type { Context } from 'hono'
import {
  type Address,
  erc20Abi,
  erc4626Abi,
  isAddress,
  zeroAddress,
} from 'viem'
import { z } from 'zod'

import { getViemClient } from '../chains'
import { db } from '../db'

const schema = z.object({
  addressOrName: z.string(),
  chainId: z.coerce.number(),
})

export async function addToken(c: Context) {
  const safeParse = schema.safeParse(await c.req.json())

  if (!safeParse.success) {
    return c.json(safeParse.error, 400)
  }

  const client = await getViemClient(safeParse.data.chainId)
  const { addressOrName, chainId } = safeParse.data

  // Treat ETH as a special case
  if (addressOrName === zeroAddress) {
    await db
      .insertInto('tokens')
      .values({
        address: zeroAddress,
        chain: chainId,
        name: 'Ether',
        symbol: 'ETH',
        decimals: 18,
      })
      .onConflict((oc) => oc.doNothing())
      .execute()
  } else {
    let address: Address

    // If the input is not an address, treat it as an ENS name
    if (!isAddress(addressOrName)) {
      const l1Client =
        safeParse.data.chainId === 1 ? client : await getViemClient(1)

      const ensAddress = await l1Client.getEnsAddress({ name: addressOrName })

      if (!ensAddress) {
        return c.json({ error: 'ENS name not found' }, 400)
      }

      address = ensAddress
    } else {
      address = addressOrName
    }

    const contract = {
      address,
      abi: [...erc20Abi, ...erc4626Abi],
    }

    const [name, symbol, decimals, erc4626Asset] = await client.multicall({
      contracts: [
        { ...contract, functionName: 'name' },
        { ...contract, functionName: 'symbol' },
        { ...contract, functionName: 'decimals' },
        { ...contract, functionName: 'asset' },
      ],
      // This is needed when a `chain` object is not provided to viem
      // Using deployments from https://github.com/mds1/multicall3
      multicallAddress: '0xca11bde05977b3631167028862be2a173976ca11',
    })

    if (!name.result || !symbol.result || !decimals.result) {
      return c.json({ error: 'Failed to fetch token data' }, 409)
    }

    let erc4626AssetDecimals: number | null = null

    if (erc4626Asset.result) {
      erc4626AssetDecimals = await client.readContract({
        abi: erc20Abi,
        address: erc4626Asset.result,
        functionName: 'decimals',
      })
    }

    await db
      .insertInto('tokens')
      .values({
        address,
        chain: chainId,
        name: name.result,
        symbol: symbol.result,
        decimals: decimals.result,
        erc4626AssetAddress: erc4626Asset.result,
        erc4626AssetDecimals,
      })
      .onConflict((oc) => oc.doNothing())
      .execute()
  }

  return c.json({ success: true })
}

export async function getTokens(c: Context) {
  const { tokens, chains } = await db.transaction().execute(async (trx) => {
    const tokens = await trx.selectFrom('tokens').selectAll().execute()
    const chains = await trx.selectFrom('chains').selectAll().execute()

    return { tokens, chains }
  })

  return c.json(
    tokens.map((token) => ({
      ...token,
      chain: chains.find((chain) => chain.id === token.chain),
    }))
  )
}

const deleteTokenSchema = z.object({
  address: z.string().refine(isAddress),
  chainId: z.coerce.number(),
})

export async function deleteToken(c: Context) {
  const safeParse = deleteTokenSchema.safeParse(await c.req.json())

  if (!safeParse.success) {
    return c.json(safeParse.error, 400)
  }

  await db
    .deleteFrom('tokens')
    .where('address', '=', safeParse.data.address)
    .where('chain', '=', safeParse.data.chainId)
    .execute()

  return c.json({ success: true })
}
