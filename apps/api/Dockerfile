FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@10.17.1
COPY . .
RUN pnpm install --frozen-lockfile && pnpm nx run api:prune

FROM node:24-bookworm-slim AS production-deps
WORKDIR /app
RUN npm install --global pnpm@10.17.1
COPY --from=build /workspace/apps/api/dist/package.json /workspace/apps/api/dist/pnpm-lock.yaml /workspace/apps/api/dist/pnpm-workspace.yaml ./
COPY --from=build /workspace/apps/api/dist/workspace_modules ./workspace_modules
RUN pnpm install --prod --frozen-lockfile

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000
WORKDIR /app
COPY --chown=node:node --from=production-deps /app/node_modules ./node_modules
COPY --chown=node:node --from=build /workspace/apps/api/dist/main.js ./main.js
COPY --chown=node:node --from=build /workspace/apps/api/migrate.mjs ./migrate.mjs
COPY --chown=node:node --from=build /workspace/apps/api/drizzle ./drizzle
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD node -e 'fetch("http://127.0.0.1:3000/health").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'
CMD ["node", "main.js"]
