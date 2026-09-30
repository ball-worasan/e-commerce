FROM node:24-bookworm-slim AS build
WORKDIR /workspace
RUN npm install --global pnpm@10.17.1
COPY . .
RUN pnpm install --frozen-lockfile && pnpm nx build @ecommerce/web

FROM node:24-bookworm-slim
ENV NODE_ENV=production PORT=3000 HOSTNAME=0.0.0.0
WORKDIR /app
COPY --chown=node:node --from=build /workspace/apps/web/.next/standalone ./
COPY --chown=node:node --from=build /workspace/apps/web/.next/static ./apps/web/.next/static
COPY --chown=node:node --from=build /workspace/apps/web/public ./apps/web/public
USER node
EXPOSE 3000
HEALTHCHECK --interval=30s --timeout=3s --start-period=15s \
  CMD node -e 'fetch("http://127.0.0.1:3000/").then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))'
CMD ["node", "apps/web/server.js"]
