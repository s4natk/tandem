import type {
  Activity,
  BoardCard,
  BoardColumn,
  BoardSnapshot,
  PresenceUser,
} from "@collab/shared";
import { create } from "zustand";

/**
 * Authoritative client-side board state.
 *
 * Mutations are applied through the reducer-style actions here. Local
 * optimistic updates are allowed but the server's broadcasts always win:
 * incoming snapshot/card/column events overwrite local state.
 */

interface BoardState {
  roomId: string | null;
  loaded: boolean;
  revision: number;
  columns: Record<string, BoardColumn>;
  cards: Record<string, BoardCard>;
  columnOrder: string[];
  cardsByColumn: Record<string, string[]>;
  presence: Record<string, PresenceUser>;
  // Active-card hover state per user (for "user is looking at this card" pills).
  activeCardByUser: Record<string, string | null>;
  activity: Activity[];
  // Cards transiently being moved by the user (drag-and-drop)
  draggingCardId: string | null;

  hydrate: (snapshot: BoardSnapshot) => void;
  reset: () => void;
  setPresence: (list: PresenceUser[]) => void;
  presenceJoined: (user: PresenceUser) => void;
  presenceLeft: (userId: string, socketId: string) => void;
  setActiveCard: (userId: string, cardId: string | null) => void;
  appendActivity: (activity: Activity) => void;

  upsertColumn: (column: BoardColumn) => void;
  removeColumn: (columnId: string) => void;
  upsertCard: (card: BoardCard) => void;
  removeCard: (cardId: string) => void;

  setDragging: (cardId: string | null) => void;
}

const initial = {
  roomId: null,
  loaded: false,
  revision: 0,
  columns: {} as Record<string, BoardColumn>,
  cards: {} as Record<string, BoardCard>,
  columnOrder: [] as string[],
  cardsByColumn: {} as Record<string, string[]>,
  presence: {} as Record<string, PresenceUser>,
  activeCardByUser: {} as Record<string, string | null>,
  activity: [] as Activity[],
  draggingCardId: null as string | null,
};

function sortColumns(columns: Record<string, BoardColumn>): string[] {
  return Object.values(columns)
    .sort((a, b) => a.position - b.position)
    .map((c) => c.id);
}

function indexCardsByColumn(
  columns: Record<string, BoardColumn>,
  cards: Record<string, BoardCard>,
): Record<string, string[]> {
  const out: Record<string, string[]> = {};
  for (const colId of Object.keys(columns)) out[colId] = [];
  for (const card of Object.values(cards)) {
    if (!out[card.columnId]) out[card.columnId] = [];
    out[card.columnId]!.push(card.id);
  }
  for (const colId of Object.keys(out)) {
    out[colId]!.sort((a, b) => cards[a]!.position - cards[b]!.position);
  }
  return out;
}

export const useBoardStore = create<BoardState>((set) => ({
  ...initial,

  reset: () => set({ ...initial }),

  hydrate: (snapshot) => {
    const columns: Record<string, BoardColumn> = {};
    for (const c of snapshot.columns) columns[c.id] = c;
    const cards: Record<string, BoardCard> = {};
    for (const c of snapshot.cards) cards[c.id] = c;
    set({
      roomId: snapshot.roomId,
      loaded: true,
      revision: snapshot.revision,
      columns,
      cards,
      columnOrder: sortColumns(columns),
      cardsByColumn: indexCardsByColumn(columns, cards),
    });
  },

  setPresence: (list) =>
    set(() => {
      const presence: Record<string, PresenceUser> = {};
      for (const u of list) presence[u.socketId] = u;
      return { presence };
    }),

  presenceJoined: (user) =>
    set((s) => ({ presence: { ...s.presence, [user.socketId]: user } })),

  presenceLeft: (_userId, socketId) =>
    set((s) => {
      const { [socketId]: _gone, ...rest } = s.presence;
      return { presence: rest };
    }),

  setActiveCard: (userId, cardId) =>
    set((s) => ({
      activeCardByUser: { ...s.activeCardByUser, [userId]: cardId },
    })),

  appendActivity: (activity) =>
    set((s) => ({ activity: [...s.activity, activity].slice(-200) })),

  upsertColumn: (column) =>
    set((s) => {
      const columns = { ...s.columns, [column.id]: column };
      const cardsByColumn = s.cardsByColumn[column.id]
        ? s.cardsByColumn
        : { ...s.cardsByColumn, [column.id]: [] };
      return {
        columns,
        cardsByColumn,
        columnOrder: sortColumns(columns),
      };
    }),

  removeColumn: (columnId) =>
    set((s) => {
      const { [columnId]: _droppedCol, ...columns } = s.columns;
      const { [columnId]: droppedIds, ...cardsByColumn } = s.cardsByColumn;
      const cards = { ...s.cards };
      for (const id of droppedIds ?? []) delete cards[id];
      return {
        columns,
        cards,
        cardsByColumn,
        columnOrder: sortColumns(columns),
      };
    }),

  upsertCard: (card) =>
    set((s) => {
      const cards = { ...s.cards, [card.id]: card };
      // Remove from the previous column if it changed.
      const prev = s.cards[card.id];
      const cardsByColumn = { ...s.cardsByColumn };
      if (prev && prev.columnId !== card.columnId) {
        cardsByColumn[prev.columnId] = (cardsByColumn[prev.columnId] ?? []).filter(
          (id) => id !== card.id,
        );
      }
      const dest = cardsByColumn[card.columnId] ?? [];
      const without = dest.filter((id) => id !== card.id);
      const inserted = insertSortedById(without, card.id, cards);
      cardsByColumn[card.columnId] = inserted;
      return { cards, cardsByColumn };
    }),

  removeCard: (cardId) =>
    set((s) => {
      const card = s.cards[cardId];
      if (!card) return s;
      const { [cardId]: _gone, ...cards } = s.cards;
      const cardsByColumn = { ...s.cardsByColumn };
      cardsByColumn[card.columnId] = (cardsByColumn[card.columnId] ?? []).filter(
        (id) => id !== cardId,
      );
      return { cards, cardsByColumn };
    }),

  setDragging: (cardId) => set({ draggingCardId: cardId }),
}));

function insertSortedById(
  ids: string[],
  newId: string,
  cards: Record<string, BoardCard>,
): string[] {
  const newCard = cards[newId];
  if (!newCard) return ids;
  const result = [...ids];
  let idx = result.findIndex((id) => (cards[id]?.position ?? 0) > newCard.position);
  if (idx === -1) idx = result.length;
  result.splice(idx, 0, newId);
  return result;
}
