# WebSocket Event Contract

The Socket.IO event contract is defined once in
[`packages/shared/src/events.ts`](../packages/shared/src/events.ts) and
shared between server and client.

## Direction

| Symbol | Meaning                             |
| ------ | ----------------------------------- |
| C → S  | Client → Server (with optional ack) |
| S → C  | Server → Client(s) in the room      |

## Authentication

The Socket.IO handshake must include the same JWT access token as REST:

```ts
io(url, { auth: { token: accessToken } });
```

If the token is missing or expired, the connection is rejected with an
`UnauthorizedError`. After successful auth, the user identity is attached
to `socket.data` server-side. **Clients cannot self-assert their user
identity in any subsequent event.**

## Lifecycle

| Event          | Dir | Payload                            | Notes                                    |
| -------------- | --- | ---------------------------------- | ---------------------------------------- |
| `room:join`    | C→S | `{ roomId }`                       | Ack returns `RoomSnapshotEvent`          |
| `room:leave`   | C→S | `{ roomId }`                       | Fire-and-forget                          |
| `room:snapshot`| S→C | `{ snapshot, presence, recentActivity }` | Sent on join (also via ack)        |
| `room:error`   | S→C | `{ code, message, conflict? }`     | Soft errors that don't close the socket  |

## Presence

| Event                     | Dir | Payload                                         |
| ------------------------- | --- | ----------------------------------------------- |
| `presence:list`           | S→C | `{ roomId, users[] }`                           |
| `presence:joined`         | S→C | `{ roomId, user }`                              |
| `presence:left`           | S→C | `{ roomId, userId, socketId }`                  |
| `presence:active_card`    | C↔S | `{ roomId, cardId }` (user is viewing a card)   |
| `presence:typing`         | C↔S | `{ roomId, cardId, typing }`                    |

## Board mutations

All mutation events use Socket.IO acks. On success the ack receives the
created/updated entity; on failure it receives a structured error:

```ts
type Ack<T> = (response:
  | { ok: true; data: T }
  | { ok: false; error: { code: string; message: string; conflict?: unknown } }
) => void;
```

### C → S

| Event                      | Payload                                          |
| -------------------------- | ------------------------------------------------ |
| `board:column:create`      | `{ roomId, title, position? }`                   |
| `board:column:update`      | `{ roomId, columnId, title?, position? }`        |
| `board:column:delete`      | `{ roomId, columnId }`                           |
| `board:card:create`        | `{ roomId, columnId, title, description?, position? }` |
| `board:card:update`        | `{ roomId, cardId, title?, description?, assigneeId?, version }` |
| `board:card:move`          | `{ roomId, cardId, toColumnId, toPosition, version }` |
| `board:card:delete`        | `{ roomId, cardId }`                             |

### S → C broadcasts

| Event                       | Payload                          |
| --------------------------- | -------------------------------- |
| `board:column:created`      | `{ roomId, column }`             |
| `board:column:updated`      | `{ roomId, column }`             |
| `board:column:deleted`      | `{ roomId, columnId }`           |
| `board:card:created`        | `{ roomId, card }`               |
| `board:card:updated`        | `{ roomId, card }`               |
| `board:card:moved`          | `{ roomId, card }`               |
| `board:card:deleted`        | `{ roomId, cardId }`             |
| `activity:appended`         | `{ roomId, activity }`           |

Note that the originator also receives the broadcast — the board store
is server-authoritative.

## Error codes

| Code                | Meaning                                              |
| ------------------- | ---------------------------------------------------- |
| `UNAUTHORIZED`      | Bad/expired token, or user no longer exists          |
| `FORBIDDEN`         | Not a member of this room                            |
| `NOT_FOUND`         | Room/column/card not found, or not in this room      |
| `VALIDATION_ERROR`  | Zod rejected the payload                             |
| `VERSION_CONFLICT`  | Stale write rejected; latest entity returned         |
| `INTERNAL_ERROR`    | Server bug — opaque, fully logged on the server side |

## Conflict handling

When the server rejects a card update or move with `VERSION_CONFLICT`,
the `conflict` field contains:

```ts
{ cardId: string; card: BoardCard }   // the current authoritative card
```

The reference web client reconciles by upserting the returned card and
showing a toast — the user can then retry their edit against the new
version.
