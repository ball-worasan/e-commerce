import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool, type PoolConfig } from 'pg';
import * as schema from './schema';

@Injectable()
export class DatabaseService implements OnModuleDestroy {
  readonly pool: Pool;
  readonly db: ReturnType<typeof drizzle<typeof schema>>;

  constructor() {
    let connection: PoolConfig;
    if (process.env.DATABASE_URL) {
      let url: URL;
      try { url = new URL(process.env.DATABASE_URL); }
      catch { throw new Error('DATABASE_URL must be a valid PostgreSQL URL'); }
      if (!['postgres:', 'postgresql:'].includes(url.protocol)) throw new Error('DATABASE_URL must use PostgreSQL');
      connection = { connectionString: process.env.DATABASE_URL };
    } else {
      const { DB_HOST: host, DB_NAME: database, DB_USER: user, DB_PASSWORD: password } = process.env;
      const port = Number(process.env.DB_PORT ?? '5432');
      if (!host || !database || !user || !password || !Number.isInteger(port) || port < 1 || port > 65535) {
        throw new Error('DATABASE_URL or complete DB_HOST/DB_PORT/DB_NAME/DB_USER/DB_PASSWORD configuration is required');
      }
      connection = { host, port, database, user, password };
    }
    this.pool = new Pool({ ...connection, max: 5, connectionTimeoutMillis: 3000 });
    this.db = drizzle(this.pool, { schema });
  }

  async onModuleDestroy(): Promise<void> {
    await this.pool.end();
  }
}
