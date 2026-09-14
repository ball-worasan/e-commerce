FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm nx build auth-service

FROM node:20-alpine
WORKDIR /app
# NOTE: this is not a complete deployable image yet. The webpack bundle
# below does not include native modules — bcrypt's compiled addon or
# Prisma's query-engine binary — so this runtime stage will fail at
# runtime until those are copied in (or externalized) separately. Known,
# accepted limitation for now.
COPY --from=build /app/apps/auth-service/dist ./
EXPOSE 3000
CMD ["node", "main.js"]
