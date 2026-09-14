FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm nx build auth-service

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/auth-service ./
EXPOSE 3000
CMD ["node", "main.js"]
