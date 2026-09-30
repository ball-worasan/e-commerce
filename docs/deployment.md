# Development and deployment

## Architecture and current state

`apps/api` is the single NestJS backend. It contains auth, product, cart, and
order modules and uses Drizzle/PostgreSQL. `apps/web` is a Next.js storefront.
The separate new-repository `apps/auth-service` is retained temporarily for
source review and is not a deployment target. The legacy Gitea-backed
auth-service DEV/STAGING/PROD Applications are distinct and untouched.

The integrated API and web source have **not** been released to k3s yet.
The currently running DEV/STAGING API digest remains the last verified one.
No production e-commerce workload or public route exists.

## Runtime contract

The API listens on `PORT` (default 3000). `/health` is process liveness and
`/ready` checks PostgreSQL. Provide `DATABASE_URL` or the `DB_HOST`, `DB_PORT`,
`DB_NAME`, `DB_USER`, `DB_PASSWORD` group. `JWT_PRIVATE_KEY_PATH` and
`JWT_PUBLIC_KEY_PATH` point to protected RS256 key files; startup fails closed
without them. `DEV_WRITE_KEY` still guards product management and must be
replaced with an administrative role gate before public release. Do not use
production or legacy auth keys as test fixtures.

The browser talks to Next.js same-origin route handlers. Next.js forwards to
the API at `API_INTERNAL_ORIGIN`, which should be an internal ClusterIP URL in
k3s. Login sets a 15-minute HttpOnly, SameSite=Lax cookie; the Secure flag is
set in production mode. The browser never receives the access token in JSON.
Mutating browser routes require a custom request header as a basic CSRF
barrier. Logout removes the cookie; an already stolen stateless JWT remains
valid until expiry. Public deployment needs a final CORS, proxy-header, CSRF,
cookie-domain, and login-abuse review.

The cart identifier is stored in browser localStorage; it is not an auth token.
The API enforces user ownership, so a cart ID from another account is rejected.

## API routes

| Method | Path | Access |
| --- | --- | --- |
| GET | `/health`, `/ready` | Public internal checks |
| POST | `/auth/register`, `/auth/login` | Public |
| GET | `/auth/me` | RS256 bearer token |
| GET | `/products`, `/products/:id` | Public |
| POST, PATCH | `/products`, `/products/:id` | Temporary `DEV_WRITE_KEY` |
| POST, GET, PATCH, DELETE | `/cart` and child routes | Authenticated owner |
| POST, GET | `/orders` and child routes | Authenticated owner |

Registration normalizes email to lowercase and hashes passwords with bcrypt.
Login issues an RS256 access token. `/auth/me` resolves the current user from
PostgreSQL and returns no password hash. No refresh token, social login, or
password reset is active in the integrated API.

Prices and totals use integer minor currency units. Order creation snapshots
prices and items in a transaction, reserves stock with conditional updates,
and allows at most one order per cart. `pending` means payment is outstanding;
no payment is collected or simulated. Cancellation/release of reserved stock
and payment integration remain future work.

## Migrations and data safety

`apps/api/drizzle/0001_*` adds users, sellers, and nullable ownership columns.
`0002_*` adds a nullable, unique order-to-cart reference. Neither migration
drops data or rewrites existing rows. Previously anonymous carts/orders remain
stored but are not exposed through the authenticated user routes. Review the
SQL and verify a fresh logical backup before applying either migration to
DEV/STAGING. Never run `prisma migrate reset` on live data. The integrated API
does not use the retained Docker `ecommerce-postgres` or legacy auth PVCs.

For local development, use a disposable PostgreSQL instance and test-only key
pair. Then run:

```sh
pnpm install --frozen-lockfile
pnpm nx run-many -t lint test build typecheck --parallel=2
node apps/api/migrate.mjs
pnpm nx serve api
```

Run the web on a different port, for example 3001, with
`API_INTERNAL_ORIGIN=http://127.0.0.1:3000`. The API smoke script exercises
registration, login, product, cart, order, ownership, duplicate order
rejection, and totals against an isolated database only.

## Containers and CI

```sh
docker build -f apps/api/Dockerfile -t e-commerce-api:local .
docker build -f apps/web/Dockerfile -t e-commerce-web:local .
```

Both images use Node 24 and run as the non-root `node` user. API migrations run
as a separate Job. The web image is a Next.js standalone build. The GitHub
Actions validation job runs the complete Nx workspace; API and web images
publish only after it passes. Use immutable `sha-<commit>` tags or digests for
GitOps. Never deploy mutable `main` as the source of truth.

## Release gates

1. Complete workspace lint/test/build/typecheck and GitHub Actions validation.
2. Verify both GHCR digests and linux/amd64 pullability.
3. Add independent DEV and STAGING RS256 key pairs through Infisical/ESO. Do
   not reuse legacy keys. Mount private/public files read-only in the API pod.
4. Review migrations and verify current logical backup coverage.
5. Update DEV migration and API images through GitOps; verify health and the
   full synthetic auth/commerce flow. Deploy the web internally and verify the
   same flow through its actual UI.
6. Promote the same verified digests to STAGING with manual Argo sync. Repeat
   health, smoke, persistence, and backup checks.
7. Make separate decisions for payment, production domain/TLS, identity abuse
   controls, inventory release, monitoring, and public security before PROD.

Rollback an API rollout by reverting the GitOps digest to the prior verified
image. Additive tables/columns are intentionally retained; do not run an
automatic down migration. Roll back web independently by its prior digest.
