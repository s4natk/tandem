import { useEffect, useRef } from "react";
import {
  SocketEvents,
  type ActivityAppendedEvent,
  type BoardCardDeletedEvent,
  type BoardCardEvent,
  type BoardColumnDeletedEvent,
  type BoardColumnEvent,
  type PresenceActiveCardEvent,
  type PresenceJoinedEvent,
  type PresenceLeftEvent,
  type PresenceListEvent,
  type RoomErrorEvent,
  type RoomSnapshotEvent,
} from "@collab/shared";
import toast from "react-hot-toast";
import { useBoardStore } from "@/store/board";
import { getSocket } from "./socket";

interface Options {
  roomId: string | null;
  /** Re-runs only on actual roomId change. */
}

/**
 * Joins a room over Socket.IO, wires up all incoming events to the board
 * store, and emits a `room:leave` on unmount. Handles reconnects by rejoining
 * the room whenever the socket reconnects.
 */
export function useRoomConnection({ roomId }: Options): void {
  const seenSnapshot = useRef(false);

  useEffect(() => {
    if (!roomId) return;
    const socket = getSocket();
    seenSnapshot.current = false;

    const join = (): void => {
      socket.emit(SocketEvents.RoomJoin, { roomId });
    };

    const onConnect = (): void => join();

    const onSnapshot = (event: RoomSnapshotEvent): void => {
      seenSnapshot.current = true;
      useBoardStore.getState().hydrate(event.snapshot);
      useBoardStore.getState().setPresence(event.presence);
      // Replace the activity feed - server gives us the recent slice.
      useBoardStore.setState({ activity: event.recentActivity });
    };

    const onError = (event: RoomErrorEvent): void => {
      toast.error(event.message || "Realtime error");
    };

    const onPresenceList = (event: PresenceListEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().setPresence(event.users);
    };
    const onPresenceJoined = (event: PresenceJoinedEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().presenceJoined(event.user);
    };
    const onPresenceLeft = (event: PresenceLeftEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().presenceLeft(event.userId, event.socketId);
    };
    const onActiveCard = (event: PresenceActiveCardEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().setActiveCard(event.userId, event.cardId);
    };

    const onColumnUpsert = (event: BoardColumnEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().upsertColumn(event.column);
    };
    const onColumnDeleted = (event: BoardColumnDeletedEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().removeColumn(event.columnId);
    };
    const onCardUpsert = (event: BoardCardEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().upsertCard(event.card);
    };
    const onCardDeleted = (event: BoardCardDeletedEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().removeCard(event.cardId);
    };
    const onActivity = (event: ActivityAppendedEvent): void => {
      if (event.roomId !== roomId) return;
      useBoardStore.getState().appendActivity(event.activity);
    };

    socket.on("connect", onConnect);
    socket.on(SocketEvents.RoomSnapshot, onSnapshot);
    socket.on(SocketEvents.RoomError, onError);
    socket.on(SocketEvents.PresenceList, onPresenceList);
    socket.on(SocketEvents.PresenceJoined, onPresenceJoined);
    socket.on(SocketEvents.PresenceLeft, onPresenceLeft);
    socket.on(SocketEvents.PresenceActiveCard, onActiveCard);
    socket.on(SocketEvents.BoardColumnCreated, onColumnUpsert);
    socket.on(SocketEvents.BoardColumnUpdated, onColumnUpsert);
    socket.on(SocketEvents.BoardColumnDeleted, onColumnDeleted);
    socket.on(SocketEvents.BoardCardCreated, onCardUpsert);
    socket.on(SocketEvents.BoardCardUpdated, onCardUpsert);
    socket.on(SocketEvents.BoardCardMoved, onCardUpsert);
    socket.on(SocketEvents.BoardCardDeleted, onCardDeleted);
    socket.on(SocketEvents.ActivityAppended, onActivity);

    if (socket.connected) join();

    return () => {
      socket.emit(SocketEvents.RoomLeave, { roomId });
      socket.off("connect", onConnect);
      socket.off(SocketEvents.RoomSnapshot, onSnapshot);
      socket.off(SocketEvents.RoomError, onError);
      socket.off(SocketEvents.PresenceList, onPresenceList);
      socket.off(SocketEvents.PresenceJoined, onPresenceJoined);
      socket.off(SocketEvents.PresenceLeft, onPresenceLeft);
      socket.off(SocketEvents.PresenceActiveCard, onActiveCard);
      socket.off(SocketEvents.BoardColumnCreated, onColumnUpsert);
      socket.off(SocketEvents.BoardColumnUpdated, onColumnUpsert);
      socket.off(SocketEvents.BoardColumnDeleted, onColumnDeleted);
      socket.off(SocketEvents.BoardCardCreated, onCardUpsert);
      socket.off(SocketEvents.BoardCardUpdated, onCardUpsert);
      socket.off(SocketEvents.BoardCardMoved, onCardUpsert);
      socket.off(SocketEvents.BoardCardDeleted, onCardDeleted);
      socket.off(SocketEvents.ActivityAppended, onActivity);
      useBoardStore.getState().reset();
    };
  }, [roomId]);
}
