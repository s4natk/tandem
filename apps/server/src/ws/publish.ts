import { SocketEvents, type Activity } from "@collab/shared";
import type { Server } from "socket.io";

/** Socket.IO room channel for a collaboration room. */
export const socketRoomId = (roomId: string): string => `room:${roomId}`;

let io: Server | null = null;

/** Called once the Socket.IO server is attached, so REST writes can broadcast. */
export function bindSocketServer(server: Server): void {
  io = server;
}

export function publishActivity(roomId: string, activity: Activity): void {
  io?.to(socketRoomId(roomId)).emit(SocketEvents.ActivityAppended, {
    roomId,
    activity,
  });
}
