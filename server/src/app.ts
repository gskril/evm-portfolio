import { createBullBoard } from '@bull-board/api'
import { BullMQAdapter } from '@bull-board/api/bullMQAdapter'
import { HonoAdapter } from '@bull-board/hono'
import { Cron } from 'croner'
import { serveStatic } from 'hono/bun'

import { api } from './api'
import { db } from './db'
import { addCheckBalanceTasksToQueue } from './handlers/balances'
import { getRateToEth } from './price'
import { erc20Queue } from './queues/workers/erc20'
import { ethQueue } from './queues/workers/eth'

export const app = api

// BullMQ Dashboard
const serverAdapter = new HonoAdapter(serveStatic)
const basePath = '/dashboard'

createBullBoard({
  queues: [new BullMQAdapter(ethQueue), new BullMQAdapter(erc20Queue)],
  serverAdapter,
})

serverAdapter.setBasePath(basePath)
// @ts-ignore
app.route(basePath, serverAdapter.registerPlugin())

// Networth cron job, runs every 12 hours
new Cron('0 */12 * * *', async () => {
  const balances = (await db
    .selectFrom('balances')
    .select([db.fn.sum('ethValue').as('ethValue')])
    .where('balance', '>', 0)
    .executeTakeFirst()) as { ethValue: number | null } | undefined

  if (!balances) {
    console.log('No balances found to save networth')
    return
  }

  const ethValue = balances.ethValue ?? 0

  // Get the current ETH/USD rate (USDC rate to ETH, inverted)
  let usdValue: number | null = null
  try {
    const usdcRateToEth = await getRateToEth({
      address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48', // USDC on mainnet
      decimals: 6,
      chainId: 1,
    })
    // Convert ETH value to USD: ethValue / usdcRateToEth
    // (usdcRateToEth is how much ETH 1 USDC is worth, so we divide)
    usdValue = ethValue / usdcRateToEth
  } catch (error) {
    console.error('Failed to get USD rate for networth snapshot:', error)
  }

  await db
    .insertInto('networth')
    .values({
      ethValue,
      usdValue,
    })
    .execute()

  // Add check balance tasks to queue so they will be updated for the next snapshot
  await addCheckBalanceTasksToQueue()
})
