# New e-commerce auth-service source

This is the **new, intended** `apps/auth-service` project in the GitHub
monorepo. It is separate from the three **legacy Gitea-backed auth-service**
Applications already running in k3s. This new project is not deployed to k3s,
has no Argo Application, and does not use legacy PVCs or user records.

The service is a NestJS API with PostgreSQL via Prisma. Its schema contains
User and Seller models. Registration hashes passwords with bcrypt; login signs
RS256 access and refresh JWTs using key paths supplied at runtime. The
configured `PORT` controls its listener. `GET /health` returns process health.
Runtime configuration requires `DATABASE_URL`, `JWT_PRIVATE_KEY_PATH`,
`JWT_PUBLIC_KEY_PATH`, and `PORT`; see `.env.example` for names and local setup.
Never commit populated `.env` files, runtime keys, or real database credentials.

The unit test suite uses an in-memory RSA test key pair and mocked Prisma
operations. The Nest health test overrides the database and key providers.
The Prisma lifecycle test verifies connect/disconnect delegation without
connecting to a database. No test uses host port 5433 or production key files.
Prisma client generation runs before the auth-service build, test, and
typecheck targets. The monorepo CI runs the full Nx validation gate before
publishing the e-commerce API image.

Database integration, migration verification, and deployment need an isolated
disposable PostgreSQL instance. Do not point tests at the retained Docker
`ecommerce-postgres`, the live e-commerce DEV PVC, or legacy auth-service DBs.
No public route or production identity policy is established by this code.
