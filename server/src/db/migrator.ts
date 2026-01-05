// https://github.com/beatrix-ha/beatrix/blob/main/server/migrations/this-sucks.ts
import type { MigrationProvider } from 'kysely'

// NB: We do this because Kysely migrators assume that they can roll through
// a directory of migrators as plain JavaScript files, which isn't true in Bun,
// in both dev mode and single-file executable mode.
import * as m1 from './migrations/001_initial_migrations'
import * as m2 from './migrations/002_erc4626'
import * as m3 from './migrations/003_usd_networth'
import * as m4 from './migrations/004_password_encryption'

const migrations = [m1, m2, m3, m4]

export const migrator: MigrationProvider = {
  async getMigrations() {
    return Object.fromEntries(migrations.map((m, i) => [`migration-${i}`, m]))
  },
}
