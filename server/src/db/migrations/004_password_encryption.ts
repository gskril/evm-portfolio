import { Kysely, sql } from 'kysely'

export const up = async (db: Kysely<any>) => {
  // AUTH table for storing password hash
  // Single row table (id=1) since we only support one user
  await db.schema
    .createTable('auth')
    .ifNotExists()
    .addColumn('id', 'integer', (col) => col.notNull().primaryKey().defaultTo(1))
    .addColumn('passwordHash', 'text') // Nullable to allow graceful migration
    .addColumn('createdAt', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`current_timestamp`)
    )
    .addColumn('updatedAt', 'timestamptz', (col) =>
      col.notNull().defaultTo(sql`current_timestamp`)
    )
    .execute()

  // Insert a single row with no password (user will set it up on first login)
  await db
    .insertInto('auth')
    .values({
      id: 1,
      passwordHash: null,
    })
    .execute()
}

export const down = async (db: Kysely<any>) => {
  await db.schema.dropTable('auth').ifExists().execute()
}
