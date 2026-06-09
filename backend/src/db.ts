import { Pool } from 'pg';

let pool: Pool | null = null;

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
  });
} else {
  console.warn('[db] DATABASE_URL not set — database features disabled');
}

export default pool;
