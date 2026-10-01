import { io, type Socket } from "socket.io-client";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store/auth";

/**
 * Lazily-instantiated singleton Socket.IO client.
 *
 * - Always uses the most recent access token from the auth store.
 * - Reconnects automatically with exponential backoff.
 * - Disposed via `closeSocket` when the user logs out.
 */
let socket: Socket | null = null;

export function getSocket(): Socket {
  if (socket && socket.connected) return socket;
  if (socket) return socket;

  socket = io(env.wsUrl, {
    transports: ["websocket"],
    autoConnect: true,
    reconnection: true,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 500,
    reconnectionDelayMax: 5_000,
    timeout: 10_000,
    auth: (cb) => cb({ token: useAuthStore.getState().accessToken }),
  });

  socket.on("connect_error", (err) => {
    // eslint-disable-next-line no-console
    console.warn("[ws] connect_error", err.message);
  });

  return socket;
}

export function closeSocket(): void {
  if (socket) {
    socket.removeAllListeners();
    socket.close();
    socket = null;
  }
}
