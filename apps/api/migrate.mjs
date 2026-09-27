import pg from 'pg';
import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { fileURLToPath } from 'node:url';

const connectionString = process.env.DATABASE_URL;
const { Pool } = pg;
let connection;
if (connectionString) {
  let url;
  try { url = new URL(connectionString); }
  catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL'); }
  if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
  connection = { connectionString };
} else {
  const { DB_HOST: host, DB_NAME: database, DB_USER: user, DB_PASSWORD: password } = process.env;
  const port = Number(process.env.DB_PORT ?? '5432');
  if (!host || !database || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error('DATABASE_URL or complete DB_* configuration is required');
  }
  connection = { host, port, database, user, password };
}
const pool = new Pool({ ...connection, max: 1, connectionTimeoutMillis: 3000 });
try {
  await migrate(drizzle(pool), { migrationsFolder: fileURLToPath(new URL('./drizzle/', import.meta.url)) });
  console.log('Database migrations complete');
} finally {
  await pool.end();
}
