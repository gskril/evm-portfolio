import { Kysely, sql } from 'kysely'

export const up = async (db: Kysely<any>) => {
  // CHAINS
  await db.schema
    .createTable('chains')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.notNull().primaryKey())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('rpcUrl', 'text', (col) => col.notNull())
    .execute()

  // ACCOUNTS
  await db.schema
    .createTable('accounts')
    .ifNotExists()
    .addColumn('id', 'integer', (col) =>
      col.notNull().primaryKey().autoIncrement()
    )
    .addColumn('address', 'text')
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('description', 'text')
    .addColumn('createdAt', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`current_timestamp`)
    )
    .execute()

  // TOKENS
  await db.schema
    .createTable('tokens')
    .ifNotExists()
    .addColumn('id', 'integer', (col) =>
      col.notNull().primaryKey().autoIncrement()
    )
    .addColumn('address', 'text', (col) => col.notNull())
    .addColumn('chain', 'integer', (col) =>
      col.references('chains.id').onDelete('cascade').notNull()
    )
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('symbol', 'text', (col) => col.notNull())
    .addColumn('decimals', 'integer', (col) => col.notNull())
    .addUniqueConstraint('tokens_address_chain_unique', ['address', 'chain'])
    .execute()

  // BALANCES
  await db.schema
    .createTable('balances')
    .ifNotExists()
    .addColumn('token', 'integer', (col) =>
      col.references('tokens.id').onDelete('cascade').notNull()
    )
    .addColumn('owner', 'integer', (col) =>
      col.references('accounts.id').onDelete('cascade').notNull()
    )
    .addColumn('balance', 'integer', (col) => col.notNull())
    .addColumn('ethValue', 'integer', (col) => col.notNull())
    .addColumn('updatedAt', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`current_timestamp`)
    )
    .addPrimaryKeyConstraint('balances_pkey', ['token', 'owner'])
    .execute()

  // NETWORTH
  await db.schema
    .createTable('networth')
    .ifNotExists()
    .addColumn('timestamp', 'timestamptz', (col) =>
      col
        .notNull()
        .primaryKey()
        .defaultTo(sql`current_timestamp`)
    )
    .addColumn('ethValue', 'integer', (col) => col.notNull())
    .execute()
}

export const down = async (db: Kysely<any>) => {
  // Delete in reverse order of above so that foreign keys are not violated.
  await db.schema.dropTable('networth').ifExists().execute()
  await db.schema.dropTable('balances').ifExists().execute()
  await db.schema.dropTable('tokens').ifExists().execute()
  await db.schema.dropTable('accounts').ifExists().execute()
  await db.schema.dropTable('chains').ifExists().execute()
}
