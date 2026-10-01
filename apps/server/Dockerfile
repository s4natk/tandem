# syntax=docker/dockerfile:1.7
# Multi-stage build for the collab server.
# Built from the monorepo root: `docker build -f apps/server/Dockerfile .`

# ---- deps -------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /workspace

# Install only the manifests required for the workspace install.
COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/server/package.json ./apps/server/

# We rely on npm workspaces, so a single install resolves shared + server.
RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund --ignore-scripts

# ---- build ------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
WORKDIR /workspace
ENV NODE_ENV=development

COPY --from=deps /workspace/node_modules ./node_modules
COPY tsconfig.base.json ./
COPY package.json ./
COPY packages ./packages
COPY apps/server ./apps/server

RUN npx prisma generate --schema apps/server/prisma/schema.prisma \
 && npm run build -w @collab/shared \
 && npm run build -w @collab/server

# ---- runtime ----------------------------------------------------------------
FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=4000

RUN apt-get update && apt-get install -y --no-install-recommends openssl ca-certificates \
 && rm -rf /var/lib/apt/lists/*

COPY --from=build /workspace/package.json ./package.json
COPY --from=build /workspace/node_modules ./node_modules
COPY --from=build /workspace/packages/shared/package.json ./packages/shared/package.json
COPY --from=build /workspace/packages/shared/dist ./packages/shared/dist
COPY --from=build /workspace/apps/server/package.json ./apps/server/package.json
COPY --from=build /workspace/apps/server/dist ./apps/server/dist
COPY --from=build /workspace/apps/server/prisma ./apps/server/prisma

EXPOSE 4000
USER node
CMD ["node", "apps/server/dist/main.js"]
