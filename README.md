# e-commerce

Nx/pnpm monorepo for a small store. The target architecture is a **modular monolith**:
`apps/api` is the NestJS backend, `apps/web` is the Next.js frontend, and domain
modules call each other in process. PostgreSQL stores users, products, carts,
and orders. There is no payment provider or public production deployment.

The source now contains integrated registration, RS256 login, user-owned carts
and orders, product browsing, and a basic browser storefront. **These changes
are not yet the verified DEV/STAGING release.** Both clusters remain on their
previous digest until new CI, image, migration, and rollout gates pass.

`apps/auth-service` is the **new GitHub repository's undeployed source project**.
It is temporarily retained while its Prisma/Seller history and removal gate are
reviewed; it must not be deployed as a separate backend. The three running
Gitea-backed auth-service Applications are unrelated legacy workloads and remain
untouched.

See [development and deployment](docs/deployment.md) for configuration,
validation, migrations, security boundaries, and release gates.

## Quick start

Use Node 24, pnpm 10.17.1, and a disposable local PostgreSQL database:

```sh
pnpm install --frozen-lockfile
pnpm nx run-many -t lint test build typecheck --parallel=2
node apps/api/migrate.mjs
pnpm nx serve api
```

Provide database configuration and test-only RS256 key file paths through the
environment. `apps/web` can run separately on port 3001 with
`API_INTERNAL_ORIGIN=http://127.0.0.1:3000`. Never commit runtime keys or
populated `.env` files.
