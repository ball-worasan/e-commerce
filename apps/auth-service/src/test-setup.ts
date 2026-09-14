/**
 * Runs before every test file in this project (see jest.config.cts's
 * `setupFiles`). `app.module.ts` calls `loadEnv()` and `loadJwtKeys(env)` at
 * module-load time, so anything that imports `AppModule` (directly or
 * transitively) needs a valid environment already in place before that
 * import happens - this file provides it.
 *
 * Values point at the local `dev` docker-compose Postgres (see
 * apps/auth-service/.env.example) and the repo-root RS256 key pair. Any of
 * these can still be overridden by real env vars (e.g. in CI).
 */
import { join } from 'path';

// Resolve relative to this file's own location (repo-root/apps/auth-service/src)
// rather than process.cwd() - Nx's jest executor runs with cwd set to the
// project root (apps/auth-service), not the repo root, so a cwd-relative
// path would point at the wrong place.
const repoRoot = join(__dirname, '..', '..', '..');

process.env.NODE_ENV = process.env.NODE_ENV || 'test';
process.env.PORT = process.env.PORT || '3001';
process.env.DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/auth';
process.env.JWT_PRIVATE_KEY_PATH =
  process.env.JWT_PRIVATE_KEY_PATH ||
  join(repoRoot, 'secrets/jwt-private.pem');
process.env.JWT_PUBLIC_KEY_PATH =
  process.env.JWT_PUBLIC_KEY_PATH ||
  join(repoRoot, 'secrets/jwt-public.pem');
