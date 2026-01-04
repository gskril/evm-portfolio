import { Kysely } from 'kysely'

// Change networth snapshots from ETH to USD
export const up = async (db: Kysely<any>) => {
  // Add usdValue column
  await db.schema
    .alterTable('networth')
    .addColumn('usdValue', 'real')
    .execute()

  // Drop the old ethValue column
  await db.schema.alterTable('networth').dropColumn('ethValue').execute()
}

export const down = async (db: Kysely<any>) => {
  // Add back ethValue column
  await db.schema
    .alterTable('networth')
    .addColumn('ethValue', 'integer')
    .execute()

  // Drop usdValue column
  await db.schema.alterTable('networth').dropColumn('usdValue').execute()
}
