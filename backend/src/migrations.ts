import 'dotenv/config';
import pool from './db';

interface Migration {
  id: number;
  name: string;
  sql: string;
}

const migrations: Migration[] = [
  {
    id: 1,
    name: 'create_participants_table',
    sql: `
      CREATE TABLE IF NOT EXISTS participants (
        id             SERIAL PRIMARY KEY,
        name           VARCHAR(100) NOT NULL UNIQUE,
        points         INTEGER NOT NULL DEFAULT 0,
        champion_pick  VARCHAR(100),
        tier1_team     VARCHAR(100),
        tier2_team_a   VARCHAR(100),
        tier2_team_b   VARCHAR(100),
        tier3_team_a   VARCHAR(100),
        tier3_team_b   VARCHAR(100),
        tier4_team     VARCHAR(100),
        created_at     TIMESTAMPTZ DEFAULT NOW(),
        updated_at     TIMESTAMPTZ DEFAULT NOW()
      )
    `,
  },
  {
    id: 2,
    name: 'expand_tier4_to_three_teams',
    // Rename tier4_team → tier4_team_a only if the old column still exists,
    // then add tier4_team_b and tier4_team_c if they don't exist yet.
    sql: `
      DO $$ BEGIN
        IF EXISTS (
          SELECT 1 FROM information_schema.columns
          WHERE table_name = 'participants' AND column_name = 'tier4_team'
        ) THEN
          ALTER TABLE participants RENAME COLUMN tier4_team TO tier4_team_a;
        END IF;
      END $$;
      ALTER TABLE participants ADD COLUMN IF NOT EXISTS tier4_team_b VARCHAR(100);
      ALTER TABLE participants ADD COLUMN IF NOT EXISTS tier4_team_c VARCHAR(100);
    `,
  },
];

export async function runMigrations(): Promise<void> {
  if (!pool) {
    console.warn('[migrate] DATABASE_URL not set — skipping migrations');
    return;
  }

  // Create the migrations tracking table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      id         INTEGER PRIMARY KEY,
      name       TEXT NOT NULL,
      applied_at TIMESTAMPTZ DEFAULT NOW()
    )
  `);

  // Find which migrations have already been applied
  const { rows } = await pool.query<{ id: number }>('SELECT id FROM schema_migrations');
  const applied = new Set(rows.map(r => r.id));

  const pending = migrations.filter(m => !applied.has(m.id));
  if (pending.length === 0) {
    console.log('[migrate] All migrations up to date');
    return;
  }

  for (const migration of pending) {
    console.log(`[migrate] Applying migration ${migration.id}: ${migration.name}`);
    await pool.query(migration.sql);
    await pool.query(
      'INSERT INTO schema_migrations (id, name) VALUES ($1, $2)',
      [migration.id, migration.name]
    );
    console.log(`[migrate] ✓ Migration ${migration.id} applied`);
  }
}

// Allow running directly: npx ts-node src/migrations.ts
if (require.main === module) {
  runMigrations()
    .then(() => {
      console.log('[migrate] Done');
      process.exit(0);
    })
    .catch(err => {
      console.error('[migrate] Failed:', err);
      process.exit(1);
    });
}
