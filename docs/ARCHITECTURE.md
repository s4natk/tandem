# Architecture

This document explains the design of the realtime-collab-app: the layers,
data model, real-time strategy, conflict resolution, and how local
development maps onto an AWS production deployment.

## 1. Goals and constraints

The system is designed around four constraints:

1. **Real-time correctness over throughput.** A wrong drag-drop is worse
   than a slow one. Conflict resolution must be deterministic and visible
   to the user.
2. **Horizontal scalability of the websocket tier.** The gateway must
   work whether there's one backend instance or twenty.
3. **No client-side trust.** The server independently re-validates every
   permission, every payload, and every version number.
4. **Optional cloud, mandatory local.** The whole stack must run locally
   with `docker compose up` and zero AWS credentials.

## 2. System overview

```
                          ┌───────────────────────────┐
                          │     CloudFront (CDN)      │   prod
                          └───────────────┬───────────┘
                                          │
   browser (React SPA) ──────────────────►│
        │   wss / https                   │
        ▼                                 ▼
   ┌──────────┐                  ┌──────────────────┐
   │  Fastify │  Socket.IO       │   S3 (static)    │
   │  + ws    │◄────────────────►│    apps/web      │
   └────┬─────┘                  └──────────────────┘
        │
        │ Prisma                    Redis pubsub
        ▼                                  ▲
   ┌──────────┐                            │
   │ Postgres │                      ┌─────┴────┐
   └──────────┘                      │ socket.io│
                                     │  adapter │
                                     └──────────┘

   AWS:  ECS Fargate (≥2 tasks) ──► RDS Postgres
                                ──► ElastiCache Redis
                                ──► S3 (attachments)
```

## 3. Layering

The server is intentionally split into transport-agnostic services with
narrow, well-typed interfaces. The same service is invoked from both
REST handlers and Socket.IO handlers.

```
modules/board/board.service.ts   ←── pure domain logic + Prisma I/O
        ▲                            (no Fastify, no Socket.IO)
        │
   ┌────┴───────────────┐
   │                    │
modules/board/          ws/gateway.ts
  board.routes.ts       (Socket.IO event → service → broadcast)
  (REST GET only)
```

This layering means:

- The board mutation code path is **identical** whether the change came
  from HTTP or websocket.
- Adding a new transport (e.g. gRPC) would be a thin adapter.
- Unit tests target services directly; the websocket layer is
  exercised only for routing/serialization.

## 4. Data model

The Prisma schema (`apps/server/prisma/schema.prisma`) normalizes around
seven first-class entities:

| Entity            | Purpose                                                            |
| ----------------- | ------------------------------------------------------------------ |
| `User`            | Identity (email, password hash, avatar color).                     |
| `RefreshToken`    | Hashed, revocable, per-device refresh sessions.                    |
| `Workspace`       | Top-level tenant — every room belongs to a workspace.              |
| `WorkspaceMember` | M:N user ↔ workspace with role (`OWNER`/`EDITOR`/`VIEWER`).        |
| `Room`            | A board. Has a unique `code` (join-by-code) and a `revision` counter. |
| `RoomMember`      | M:N user ↔ room with role.                                         |
| `Column` / `Card` | Kanban state with sparse `position` (Float) and `version` (Int).   |
| `Activity`        | Append-only audit feed.                                            |
| `Attachment`      | Optional S3 attachment, file metadata.                             |

Key design notes:

- **Sparse positions.** Cards and columns use a `Float` position. New
  items insert at the midpoint between siblings (`positionBetween`),
  letting a single `UPDATE` reorder a list of any size. Renumbering only
  happens if positions ever collapse below ε — `needsRebalance()`
  reports that, and a future maintenance task can normalize the list.
- **Per-card `version`.** Every card update or move increments
  `version`. Clients send the version they last saw; mismatched
  versions produce `VERSION_CONFLICT` and the server returns the
  authoritative card so the client can reconcile without a refetch.
- **Per-room `revision`.** Every mutation bumps the room's revision.
  This is exposed in the snapshot and is useful for "did anything
  change since I last looked" patterns (e.g. analytics).
- **Hashed refresh tokens.** Raw refresh tokens never touch the DB; we
  store SHA-256. Refresh rotation revokes the old `jti` whether or not
  reissue succeeds.

## 5. Auth flow

```
1. POST /api/auth/signup or /login
     → issues  accessToken (15m)  +  refreshToken (30d, rotated)
     → persists tokenHash + jti in DB

2. API requests carry `Authorization: Bearer <access>`
     → `requireAuth` decodes JWT, attaches user to FastifyRequest

3. On 401 the client api client triggers a single-flight
     POST /api/auth/refresh { refreshToken }
     → old jti is revoked
     → new tokens are issued
     → original request is retried once

4. Socket.IO handshake reads the same access token from
   `socket.handshake.auth.token` (or Authorization header).
   The gateway re-validates and looks the user up against
   Postgres - a deleted/banned user cannot reconnect.
```

## 6. Real-time strategy

### 6.1 Event contract

All WS events are defined in `packages/shared/src/events.ts`:

- **Lifecycle**: `room:join`, `room:leave`, `room:snapshot`, `room:error`
- **Presence**: `presence:list`, `presence:joined`, `presence:left`, `presence:active_card`, `presence:typing`
- **Board mutations (C2S)**: `board:column:create|update|delete`,
  `board:card:create|update|move|delete`
- **Board broadcasts (S2C)**: matching `*:created|updated|moved|deleted`
- **Activity feed**: `activity:appended`

Mutating C2S events use Socket.IO acks: the server replies
`{ ok: true, data }` or `{ ok: false, error }`. This lets the client
distinguish accepted vs. rejected operations.

### 6.2 Conflict resolution

Two layers:

1. **Per-card optimistic concurrency.** The client echoes the `version`
   it last saw with every update/move. The server checks it inside a
   Postgres transaction, rejects with `VERSION_CONFLICT` if stale, and
   includes the latest authoritative card in the conflict payload.
2. **Server-authoritative broadcast.** Whether the client used the ack
   or not, the server emits the canonical event (`board:card:updated`,
   etc.) to every socket in the room — including the originator. The
   board store treats incoming events as the source of truth; local
   optimistic state is only used during drag.

### 6.3 Presence

Presence is stored in Redis hashes keyed by `presence:room:{roomId}` →
`{ socketId : JSON(PresenceUser) }`. This gives us:

- O(1) join/leave by `socketId`.
- A cheap `HGETALL` for the full room list.
- TTLs so abandoned sockets eventually expire if the server crashes
  before a clean disconnect.

When the Socket.IO Redis adapter is enabled, every backend instance
sees the same broadcasts and the presence store is shared, so
load-balancing across multiple Fargate tasks "just works".

### 6.4 Activity feed

Every mutation also writes an `Activity` row inside the same transaction
and is broadcast as `activity:appended`. The DB is the durable log;
the broadcast is the live tail.

## 7. Scaling the websocket tier

Default deployment runs **N** Fastify+Socket.IO instances behind an ALB
(target group on the websocket port, sticky sessions optional but not
required because the Redis adapter handles cross-instance fan-out).
Connection capacity per task scales with file-descriptor and event-loop
budget; the rule of thumb for this workload (small, infrequent
messages) is ~10–20K concurrent sockets per `t3.medium`-equivalent.

If load grows past that:

- Scale ECS tasks horizontally; the Redis adapter handles broadcasts.
- Promote ElastiCache to a cluster-mode replication group.
- Move presence storage to Redis Streams if you want history.
- Shard rooms across ALBs by `roomId` if you outgrow a single Redis.

## 8. Local dev vs. production

| Concern        | Local                         | AWS                                       |
| -------------- | ----------------------------- | ----------------------------------------- |
| Postgres       | docker-compose `postgres:16-alpine` | RDS for PostgreSQL                  |
| Redis          | docker-compose `redis:7-alpine`     | ElastiCache (Redis OSS / Valkey)    |
| Server         | `tsx watch` on `node`               | ECS Fargate task (`apps/server/Dockerfile`) |
| Web            | `vite` dev server                   | S3 static hosting + CloudFront      |
| Object storage | disabled (503 on upload)            | S3 bucket + presigned URLs          |
| Logs           | pino-pretty stdout                  | CloudWatch Logs (awslogs driver)    |
| Secrets        | `.env` files                        | AWS Secrets Manager / SSM Parameter Store |

Crucially, the *application code* doesn't branch on environment — config
is environment-driven, and the only feature that becomes a no-op without
AWS credentials is the S3 attachment endpoint (which returns 503 with a
clear message).

## 9. Why these choices?

- **Fastify over Express**: faster, first-class TypeScript types, plugin
  encapsulation makes route-scoped hooks (like `requireAuth`) safe.
- **Socket.IO over raw ws**: built-in fallbacks, the Redis adapter, and
  acks are the right abstractions for ack-based mutation flows. The
  performance overhead vs. raw ws is negligible at this scale.
- **Prisma over Drizzle / Kysely**: best-in-class TypeScript ergonomics
  for relational schemas with this much branching; migration story is
  production-grade.
- **Zod everywhere**: single schema package shared between client and
  server. The same `updateCardSchema` validates the HTTP body, the WS
  payload, and the client form.
- **argon2id**: OWASP's recommended password hash; `argon2` (node-argon2)
  with their 2024 baseline parameters.
- **Zustand over Redux**: tiny, no boilerplate, type-safe. React Query
  handles server-state caching so the client store stays small and
  focused on UI/real-time state.
- **@dnd-kit over react-dnd**: better accessibility (keyboard sensors),
  smaller bundle, smoother animations.
