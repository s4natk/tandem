import type { Server, Socket } from "socket.io";

/**
 * Identity attached to each Socket.IO connection during the auth handshake.
 * Loose-typed events are used (`...any`) so we can emit our own event names
 * without enumerating every payload in a TypeScript generic - the actual
 * event contract is enforced by the shared zod schemas at runtime.
 */
export interface AuthedSocketData {
  userId: string;
  email: string;
  name: string;
  avatarColor: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AuthedSocket = Socket<any, any, any, AuthedSocketData>;

export type IOServer = Server;
