# Collab — Real-Time Collaborative Kanban

> Production-quality realtime collaboration app. Multiple users join a shared
> board, drag cards in real time, see each other's presence, and recover
> cleanly from concurrent edits. Built as a portfolio-grade reference for
> real-time systems work — TypeScript end-to-end, clean architecture,
> PostgreSQL + Redis, Socket.IO, and a deployable AWS path.

![status](https://img.shields.io/badge/status-MVP-success)
![tech](https://img.shields.io/badge/stack-Node%20%7C%20React%20%7C%20Postgres%20%7C%20Redis-blueviolet)
![license](https://img.shields.io/badge/license-MIT-blue)

---

## Demo at a glance

- **Sign up → workspace → room** with a 6–8 character shareable join code.
- **Drag-and-drop kanban** with optimistic local updates and authoritative
  server reconciliation. Card moves are versioned (OCC) — stale moves are
  rejected with a `VERSION_CONFLICT` and the client auto-resyncs.
- **Live presence**: avatar bar shows who is in the room; per-card "watcher
  rings" show who is viewing each card.
- **Activity feed** records every column/card change in real time.
- **Refresh-safe**: room state is persisted in Postgres; reconnecting picks
  up the latest snapshot and replays presence.
- **Scales horizontally**: Socket.IO uses the Redis adapter so multiple
  backend instances broadcast as one.
- **AWS-ready**: Dockerfiles for both apps, environment-driven config, and a
  step-by-step ECS/RDS/ElastiCache deployment guide in
  [`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md).

See [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the full design.

---

## Tech stack

| Layer            | Choice                                                       |
| ---------------- | ------------------------------------------------------------ |
| Frontend         | React 18, TypeScript, Vite, Tailwind, Zustand, React Query   |
| Drag and drop    | `@dnd-kit/core` + `@dnd-kit/sortable`                        |
| Realtime         | Socket.IO (websocket transport)                              |
| Backend          | Node 20, TypeScript, Fastify 5, Pino, Zod                    |
| Auth             | JWT (HS256) access + rotated refresh tokens, argon2id        |
| Database         | PostgreSQL 16 via Prisma 5                                   |
| Cache / pubsub   | Redis 7 (presence, rate limits, socket.io adapter)           |
| Object storage   | AWS S3 via presigned URLs (optional; gracefully disabled)    |
| Tests            | Vitest                                                       |
| Containerization | Docker + multi-stage Dockerfiles + docker-compose            |
| Cloud target     | AWS ECS Fargate / RDS / ElastiCache / S3 / CloudFront        |

---

## Repository layout

```
realtime-collab-app/
├── apps/
│   ├── server/                 # Fastify API + Socket.IO gateway
│   │   ├── src/
│   │   │   ├── config/         # env parsing + logger
│   │   │   ├── db/             # Prisma client singleton
│   │   │   ├── redis/          # ioredis pub/sub/app connections
│   │   │   ├── errors/         # AppError hierarchy
│   │   │   ├── middleware/     # auth pre-handler, error formatter
│   │   │   ├── plugins/        # cors, helmet, rate-limit, sensible
│   │   │   ├── modules/
│   │   │   │   ├── auth/       # signup/login/refresh + JWT + argon2id
│   │   │   │   ├── workspaces/
│   │   │   │   ├── rooms/      # CRUD + join-by-code
│   │   │   │   ├── board/      # columns/cards + OCC + sparse positions
│   │   │   │   ├── activity/   # append-only feed
│   │   │   │   └── attachments/# S3 presigned URLs (optional)
│   │   │   ├── ws/             # gateway, presence store, types
│   │   │   ├── utils/          # avatar color, room code, position math
│   │   │   ├── server.ts       # buildServer() factory
│   │   │   └── main.ts         # entry + graceful shutdown
│   │   ├── prisma/
│   │   │   ├── schema.prisma
│   │   │   └── seed.ts
│   │   └── test/               # vitest
│   └── web/                    # React + Vite frontend
│       ├── src/
│       │   ├── api/            # typed fetch client + endpoint helpers
│       │   ├── auth/           # bootstrap + RequireAuth route guard
│       │   ├── components/
│       │   │   ├── board/      # Column / Card / ActivityFeed / PresenceBar
│       │   │   ├── ui/         # Avatar / Modal / Spinner primitives
│       │   │   └── AppShell.tsx
│       │   ├── pages/          # Login, Signup, Home, Workspace, Board, Join, New
│       │   ├── realtime/       # socket singleton + room connection hook
│       │   ├── store/          # zustand: auth + board state
│       │   ├── lib/            # cn + env
│       │   └── styles/         # tailwind base
│       ├── public/favicon.svg
│       ├── nginx.conf
│       └── Dockerfile
├── packages/
│   └── shared/                 # zod schemas, types, Socket.IO event contract
├── docs/
│   ├── ARCHITECTURE.md
│   ├── AWS_DEPLOYMENT.md
│   └── WS_EVENTS.md
├── docker-compose.yml
└── package.json                # npm workspaces
```

---

## Quick start (local development)

### Prerequisites

- **Node.js** 20+
- **Docker Desktop** (for Postgres + Redis)
- **npm** 10+ (Yarn / pnpm work, but the scripts here assume npm)

### 1. Install dependencies

```bash
npm install
```

### 2. Start Postgres + Redis

```bash
npm run docker:up
```

This starts `collab-postgres` and `collab-redis` on `localhost:5432` and
`localhost:6379` respectively. Data is persisted in named volumes.

### 3. Configure environment

```bash
cp .env.example apps/server/.env
cp apps/web/.env.example apps/web/.env
```

The defaults match the docker-compose services so no edits are required.

### 4. Run the database migration + seed

```bash
npm run prisma:migrate -- --name init
npm run prisma:seed -w @collab/server
```

The seed creates `demo@collab.dev` / `demo-password` with one workspace,
one room (code `demo1234`), and a starter set of cards.

### 5. Start both apps

```bash
npm run dev
```

This runs `@collab/server` (port 4000) and `@collab/web` (port 5173)
concurrently with hot reload. Open <http://localhost:5173>.

### 6. Try the realtime experience

Open two browser windows side by side (use an incognito window for the
second user). Sign in as the demo user in one and create a fresh account
in the other. Have user A join room `demo1234` and share the code with
user B. Drag a card — both sides update live; the activity feed and
presence avatars stay in sync.

---

## Useful scripts

```bash
# Top-level
npm run dev           # run server + web concurrently
npm run build         # build shared, server, web
npm run test          # vitest (server)
npm run docker:up     # start postgres + redis
npm run docker:down   # stop them

# Server-scoped
npm run dev -w @collab/server
npm run test -w @collab/server
npm run prisma:studio -w @collab/server   # GUI DB browser

# Web-scoped
npm run dev -w @collab/web
npm run build -w @collab/web
```

---

## How the realtime layer works (in one paragraph)

The client authenticates the Socket.IO handshake with the same JWT
access token it uses for REST. After joining a room, the server emits a
single `room:snapshot` event containing the full board, the presence
list, and recent activity. Every subsequent mutation (column/card
create/update/move/delete) is a Socket.IO event with an ack — the server
applies the change in a Postgres transaction (bumping the per-card
`version` and the per-room `revision`), then broadcasts the result to
every other socket in the room via the Redis adapter. Optimistic locking
on `version` is the primary conflict-resolution mechanism: a stale move
is rejected with `VERSION_CONFLICT` and the server returns the current
card so the client can reconcile without a full refetch. Presence is
stored in Redis hashes keyed by `socketId` so it survives across
multiple backend instances.

Read [`docs/WS_EVENTS.md`](docs/WS_EVENTS.md) for the full event
contract and [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for the
design rationale.

---

## What's implemented

### Backend

- [x] Fastify 5 server with Pino logging, structured error handling, Helmet, CORS, and Redis-backed rate limiting
- [x] Argon2id password hashing (OWASP 2024 parameters)
- [x] JWT access + refresh tokens, refresh-token rotation, hashed refresh tokens persisted in DB
- [x] Zod validation on every request body
- [x] Prisma schema for users, refresh tokens, workspaces, members, rooms, columns, cards, activity, attachments
- [x] Workspace + room CRUD with role-based membership (`OWNER` / `EDITOR` / `VIEWER`)
- [x] Join-by-code with auto-elevation to workspace member
- [x] Socket.IO gateway with JWT handshake auth, room-scoped events, and ack-based conflict surfacing
- [x] Optimistic concurrency on card updates and moves (`version` token)
- [x] Sparse position ("fractional indexing-lite") for cards + columns so drag inserts touch one row
- [x] Activity feed (append-only) broadcast on every mutation
- [x] Presence store in Redis with multi-instance fan-out via Socket.IO Redis adapter
- [x] S3 presigned upload/download endpoints (gracefully disabled when AWS creds absent)
- [x] Health + readiness endpoints (`/health`, `/ready`)
- [x] Graceful shutdown (SIGINT/SIGTERM): close IO, Fastify, Prisma, Redis
- [x] Vitest suite for password hashing, JWT signing, schema validation, position math, room codes, and the version-conflict path of `moveCard`

### Frontend

- [x] Vite + React + TypeScript + Tailwind with custom design tokens
- [x] Zustand auth store with localStorage persistence and single-flight refresh on 401
- [x] Zustand board store with normalized columns/cards and computed `cardsByColumn` index
- [x] React Router 6 with `RequireAuth` guard, app shell, and per-feature pages
- [x] Login / Signup with form validation, friendly error toasts, redirect-after-login
- [x] Workspace dashboard + create-workspace modal
- [x] Room dashboard + create-room modal + join-by-code page
- [x] Realtime board view: drag-and-drop columns/cards with `@dnd-kit`, drag overlay, sortable contexts
- [x] Card detail modal with edit + delete + version-aware save
- [x] Live presence bar with avatar stacking
- [x] Per-card "watcher ring" showing who is viewing each card
- [x] Streaming activity feed sidebar with auto-scroll and color-coded events
- [x] Toast notifications via `react-hot-toast`, conflict reconciliation messages

### Infrastructure

- [x] `docker-compose.yml` for Postgres + Redis (with profile-gated app services)
- [x] Multi-stage Dockerfile for the server (Prisma generate, prod-only deps)
- [x] Multi-stage Dockerfile for the web (Vite build + nginx serve + SPA fallback)
- [x] Strict environment validation (`zod`) that fails fast on missing config
- [x] `.env.example` files at root, server, and web
- [x] AWS deployment runbook ([`docs/AWS_DEPLOYMENT.md`](docs/AWS_DEPLOYMENT.md))

---

## What's intentionally left as polish

These are scoped-out for the MVP but the architecture already supports them:

- **Cursor-level real-time editing** of card descriptions (CRDT or OT). The
  event contract already exposes `typing` and `active card` indicators; a
  Yjs document attached to the card would slot in cleanly.
- **Per-room role enforcement on writes** (the schema has `VIEWER` but
  the WS layer treats every member as an editor; a single role check in
  `board.service.ts` is all it takes).
- **Pagination + server-side filtering** for the activity feed.
- **Invitation links with expiry** and email delivery (SES).
- **Soft delete + restore** for cards.
- **Email verification + password reset** (skeleton tables would be a 30
  line change).
- **Observability**: OpenTelemetry traces on REST + WS handlers, dashboards.
- **End-to-end tests** with Playwright.

These are listed not as gaps but as the natural extension surface; the
codebase is structured so each can be added without touching the others.

---

## License

MIT
