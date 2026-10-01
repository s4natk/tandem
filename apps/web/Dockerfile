# syntax=docker/dockerfile:1.7
# Multi-stage build for the collab web frontend.
# Built from the monorepo root: `docker build -f apps/web/Dockerfile .`

ARG VITE_API_URL=http://localhost:4000
ARG VITE_WS_URL=http://localhost:4000

# ---- deps -------------------------------------------------------------------
FROM node:20-bookworm-slim AS deps
WORKDIR /workspace

COPY package.json package-lock.json* ./
COPY tsconfig.base.json ./
COPY packages/shared/package.json ./packages/shared/
COPY apps/web/package.json ./apps/web/

RUN --mount=type=cache,target=/root/.npm \
    npm install --no-audit --no-fund --ignore-scripts

# ---- build ------------------------------------------------------------------
FROM node:20-bookworm-slim AS build
ARG VITE_API_URL
ARG VITE_WS_URL
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_WS_URL=$VITE_WS_URL

WORKDIR /workspace
COPY --from=deps /workspace/node_modules ./node_modules
COPY tsconfig.base.json package.json ./
COPY packages ./packages
COPY apps/web ./apps/web

RUN npm run build -w @collab/shared \
 && npm run build -w @collab/web

# ---- runtime ----------------------------------------------------------------
FROM nginx:1.27-alpine AS runtime
COPY apps/web/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
