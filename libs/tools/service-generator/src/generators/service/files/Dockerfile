FROM node:20-alpine AS build
WORKDIR /app
COPY . .
RUN corepack enable && pnpm install --frozen-lockfile
RUN pnpm nx build <%= name %>

FROM node:20-alpine
WORKDIR /app
COPY --from=build /app/dist/apps/<%= name %> ./
EXPOSE 3000
CMD ["node", "main.js"]
