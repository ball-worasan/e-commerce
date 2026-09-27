# Delivery status

Source: `ball-worasan/e-commerce` on `main`.

The checked-in project is an Nx workspace with one TypeScript library,
`@ecommerce/shared-types`. There is no application entry point, listening port,
health endpoint, Dockerfile, runtime environment contract, migration command,
frontend build, or production start command. Creating an image now would publish
a library container with nothing to serve. The CI workflow runs lint, tests,
build, and typecheck for the current Nx projects.

## Intended path once an application exists

GitHub Actions will validate the application, build a production container,
and publish an immutable commit-tagged image to GHCR. The separate
`ball-worasan/homelab-gitops` repository will hold plain Kubernetes manifests.
Argo CD will reconcile dev first; staging and production remain manual.

Before the first deployment, establish the application's runtime, port, health
probe, database and Redis needs, persistent storage needs, secret **names**,
and migration/rollback procedure from the actual code. Determine whether the
existing `ecommerce-postgres` instance and its retained databases belong to
the new application; do not reuse or alter them by name alone. Choose a route
that does not reuse auth-service NodePorts 30081–30083 while those routes run.

Never commit secret values, `.env` files, registry credentials, or kubeconfigs.
Do not create an Argo CD Application that points at a documentation-only path.
