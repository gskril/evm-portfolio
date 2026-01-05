import { Kysely, sql } from 'kysely'

export const up = async (db: Kysely<any>) => {
  // Add usdValue column to networth table
  await db.schema.alterTable('networth').addColumn('usdValue', 'real').execute()
}

export const down = async (db: Kysely<any>) => {
  await db.schema.alterTable('networth').dropColumn('usdValue').execute()
}
