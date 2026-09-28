# Development and deployment

## Runtime and scope

`apps/api` is one NestJS/Node 24 service on TCP port 3000. It uses PostgreSQL
through Drizzle ORM. `GET /health` is process liveness; `GET /ready` checks the
database. Nest validation rejects unknown fields. Logs are JSON and omit request
bodies and credentials. SIGTERM triggers a graceful database-pool close.

Product reads are open. All writes and all cart/order reads require the
`x-dev-write-key` header matching `DEV_WRITE_KEY`. When the key is unset, these
routes fail closed. This is **DEV-only access control**, not user authentication.
Do not deploy the API publicly or to production without an identity and
authorization design. There is no payment integration.

Prices and totals are integer minor currency units (`priceMinor`, `totalMinor`).
Cart totals use current product prices. Creating an order snapshots those
prices in an atomic transaction and creates a `pending` order. It does not
reserve inventory, charge a customer, or perform fulfillment. Checkout
idempotency and customer ownership remain future product work.

## Endpoints

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/health` | Liveness |
| GET | `/ready` | Database readiness |
| GET | `/products`, `/products/:id` | Product reads |
| POST | `/products` | Create product |
| PATCH | `/products/:id` | Update or soft-disable product |
| POST | `/cart` | Create cart |
| GET | `/cart/:cartId` | Read cart and recalculated total |
| POST | `/cart/:cartId/items` | Add product |
| PATCH | `/cart/:cartId/items/:itemId` | Change quantity |
| DELETE | `/cart/:cartId/items/:itemId` | Remove item |
| POST | `/orders` | Create pending order from cart |
| GET | `/orders`, `/orders/:id` | Read orders |

## Configuration

Use a local untracked `.env`, an isolated test container, or a secret manager;
`.env.example` contains placeholders only. `PORT` defaults to 3000. Provide
either `DATABASE_URL` or all of `DB_HOST`, `DB_PORT` (default 5432), `DB_NAME`,
`DB_USER`, and `DB_PASSWORD`. `DEV_WRITE_KEY` enables guarded routes. Never
commit populated environment files or log credentials.

## Develop and test

With Node 24, pnpm 10.17.1, and an **isolated** PostgreSQL database:

```sh
pnpm install --frozen-lockfile
pnpm nx run-many -t lint test typecheck build --parallel=2
pnpm --filter @ecommerce/api exec drizzle-kit generate --config=drizzle.config.ts
node apps/api/migrate.mjs
pnpm nx serve api
```

The migration command applies reviewed versioned SQL to the configured
database; it is deliberately separate from app startup. Never point it at the
retained `ecommerce-postgres` instance without a data-ownership and backup
decision. Local and CI tests do not require that live instance. The disposable
Docker smoke test uses `apps/api/smoke.mjs` with `SMOKE_BASE_URL`,
`DEV_WRITE_KEY`, and `SMOKE_ALLOW_WRITES=1` against an isolated target.

## Container and delivery

```sh
docker build -f apps/api/Dockerfile -t e-commerce-api:local .
```

The multi-stage image runs as the non-root `node` user. Run `node migrate.mjs`
as a separate, deliberate action against an isolated database before starting
`node main.js`. The image healthcheck calls `/health`; Kubernetes readiness
should call `/ready`.

GitHub Actions first validates the Nx workspace. A successful push to `main`
then publishes `ghcr.io/ball-worasan/e-commerce-api:sha-<full-commit-sha>` and
the convenience `:main` tag using `GITHUB_TOKEN`. GitOps must deploy the
immutable SHA tag or a digest, never rely on `:main`. Package visibility and
k3s pull access must be verified before Argo sync.

The intended path is GitHub → Actions → GHCR → `homelab-gitops` → Argo CD →
k3s DEV. Staging and production require independent data, secret, security,
route, and rollback decisions. The existing `ecommerce-postgres` databases are
an empty legacy scaffold by observed row counts; this application is not
connected to them. Legacy auth-service and Gitea are separate dependencies.
