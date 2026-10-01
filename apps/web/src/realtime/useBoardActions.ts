import { useCallback } from "react";
import {
  SocketEvents,
  type Ack,
  type BoardCard,
  type BoardCardEvent,
  type BoardColumnEvent,
  type CardCreatePayload,
  type CardMovePayload,
  type CardUpdatePayload,
  type ColumnCreatePayload,
  type ColumnUpdatePayload,
} from "@collab/shared";
import toast from "react-hot-toast";
import { useBoardStore } from "@/store/board";
import { getSocket } from "./socket";

function emit<T>(event: string, payload: unknown): Promise<T> {
  return new Promise((resolve, reject) => {
    const socket = getSocket();
    const ack: Ack<T> = (response) => {
      if (response.ok) resolve(response.data);
      else reject(response.error);
    };
    socket.emit(event, payload, ack);
  });
}

/**
 * Hook for board mutations. Each action emits a Socket.IO event with an
 * ack. Conflict resolution (VERSION_CONFLICT) reconciles by syncing the
 * authoritative card back into the store.
 */
export function useBoardActions(roomId: string) {
  const setActiveCard = useBoardStore((s) => s.setActiveCard);
  const upsertCard = useBoardStore((s) => s.upsertCard);

  const createColumn = useCallback(
    async (title: string) => {
      const payload: ColumnCreatePayload = { roomId, title };
      await emit<BoardColumnEvent>(SocketEvents.BoardColumnCreate, payload);
    },
    [roomId],
  );

  const updateColumn = useCallback(
    async (columnId: string, title: string) => {
      const payload: ColumnUpdatePayload = { roomId, columnId, title };
      await emit<BoardColumnEvent>(SocketEvents.BoardColumnUpdate, payload);
    },
    [roomId],
  );

  const deleteColumn = useCallback(
    async (columnId: string) => {
      await emit(SocketEvents.BoardColumnDelete, { roomId, columnId });
    },
    [roomId],
  );

  const createCard = useCallback(
    async (input: { columnId: string; title: string; description?: string }) => {
      const payload: CardCreatePayload = { roomId, ...input };
      await emit<BoardCardEvent>(SocketEvents.BoardCardCreate, payload);
    },
    [roomId],
  );

  const updateCard = useCallback(
    async (
      cardId: string,
      patch: { title?: string; description?: string | null; assigneeId?: string | null; version: number },
    ) => {
      const payload: CardUpdatePayload = { roomId, cardId, ...patch };
      try {
        await emit<BoardCardEvent>(SocketEvents.BoardCardUpdate, payload);
      } catch (err) {
        const conflict = (err as { conflict?: { card?: BoardCard } } | undefined)
          ?.conflict;
        if (conflict?.card) {
          upsertCard(conflict.card);
          toast.error("Card was updated by someone else. Refreshed to latest.");
        } else {
          toast.error(
            (err as { message?: string } | undefined)?.message ?? "Update failed",
          );
        }
      }
    },
    [roomId, upsertCard],
  );

  const moveCard = useCallback(
    async (input: { cardId: string; toColumnId: string; toPosition: number; version: number }) => {
      const payload: CardMovePayload = { roomId, ...input };
      try {
        await emit<BoardCardEvent>(SocketEvents.BoardCardMove, payload);
      } catch (err) {
        const conflict = (err as { conflict?: { card?: BoardCard } } | undefined)
          ?.conflict;
        if (conflict?.card) {
          upsertCard(conflict.card);
          toast.error("Card moved by someone else. Refreshed to latest.");
        } else {
          toast.error(
            (err as { message?: string } | undefined)?.message ?? "Move failed",
          );
        }
      }
    },
    [roomId, upsertCard],
  );

  const deleteCard = useCallback(
    async (cardId: string) => {
      await emit(SocketEvents.BoardCardDelete, { roomId, cardId });
    },
    [roomId],
  );

  const setLocalActiveCard = useCallback(
    (cardId: string | null) => {
      getSocket().emit(SocketEvents.PresenceActiveCard, { roomId, cardId });
      // Also reflect locally for our own UI feedback.
      const me = useBoardStore.getState().presence;
      const mine = Object.values(me).find((p) => p.socketId === getSocket().id);
      if (mine) setActiveCard(mine.userId, cardId);
    },
    [roomId, setActiveCard],
  );

  return {
    createColumn,
    updateColumn,
    deleteColumn,
    createCard,
    updateCard,
    moveCard,
    deleteCard,
    setLocalActiveCard,
  };
}
