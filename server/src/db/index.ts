import {
  CamelCasePlugin,
  type ColumnType,
  type GeneratedAlways,
  Kysely,
  Migrator,
  sql,
} from 'kysely'
import { BunSqliteDialect } from 'kysely-bun-worker/normal'
import type { Address } from 'viem'

import { isDocker } from '../docker'
import { migrator } from './migrator'

interface ChainRow {
  id: number
  name: string
  rpcUrl: string
}

interface AccountRow {
  id: GeneratedAlways<number>
  address: Address | null
  name: string
  description: string | null
  createdAt: GeneratedAlways<Date>
}

interface TokenRow {
  id: GeneratedAlways<number>
  address: Address
  chain: ChainRow['id']
  name: string
  symbol: string
  decimals: number
  erc4626AssetAddress: Address | null
  erc4626AssetDecimals: number | null
}

interface BalanceRow {
  token: number
  owner: number // AccountRow['id']
  balance: number
  ethValue: number
  updatedAt: ColumnType<Date, never, string | undefined>
}

interface NetworthRow {
  timestamp: ColumnType<Date, never, string>
  ethValue: number
  usdValue: number | null
}

export type Tables = {
  accounts: AccountRow
  chains: ChainRow
  tokens: TokenRow
  balances: BalanceRow
  networth: NetworthRow
}

async function createDatabase() {
  const db = new Kysely<Tables>({
    dialect: new BunSqliteDialect({
      url: isDocker() ? '/app/data/db.sqlite' : 'db.sqlite',
    }),
    plugins: [new CamelCasePlugin()],
  })

  await sql`PRAGMA foreign_keys = ON`.execute(db)

  const doit = new Migrator({
    db,
    provider: migrator,
  })

  const { results } = await doit.migrateToLatest()

  if (results) {
    if (results.some((r) => r.status === 'Error')) {
      console.error('Failed migrations:', results)
      process.exit(1)
    } else {
      console.log('Ran db migrations')
    }
  }

  return db
}

export const db = await createDatabase()
