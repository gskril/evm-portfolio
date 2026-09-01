import { Kysely } from 'kysely'

export const up = async (db: Kysely<any>) => {
  await db.schema
    .createTable('accountTags')
    .addColumn('accountId', 'integer', (col) =>
      col.references('accounts.id').onDelete('cascade').notNull()
    )
    .addColumn('tag', 'text', (col) => col.notNull())
    .addPrimaryKeyConstraint('account_tags_pkey', ['accountId', 'tag'])
    .execute()
}

export const down = async (db: Kysely<any>) => {
  await db.schema.dropTable('accountTags').execute()
}
