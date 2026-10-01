import { useCallback, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  closestCorners,
  type DragEndEvent,
  type DragStartEvent,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { useQuery } from "@tanstack/react-query";
import toast from "react-hot-toast";
import type { BoardCard } from "@collab/shared";
import { roomsApi } from "@/api/endpoints";
import { Spinner } from "@/components/ui/Spinner";
import { ActivityFeed } from "@/components/board/ActivityFeed";
import { CardDetailModal } from "@/components/board/CardDetailModal";
import { CardItem } from "@/components/board/Card";
import { ColumnView } from "@/components/board/Column";
import { PresenceBar } from "@/components/board/PresenceBar";
import { useBoardStore } from "@/store/board";
import { useRoomConnection } from "@/realtime/useRoomConnection";
import { useBoardActions } from "@/realtime/useBoardActions";

export function BoardPage(): JSX.Element {
  const { id = "" } = useParams<{ id: string }>();

  const roomQuery = useQuery({
    queryKey: ["room", id],
    queryFn: () => roomsApi.get(id),
    enabled: Boolean(id),
  });

  useRoomConnection({ roomId: id || null });

  const loaded = useBoardStore((s) => s.loaded);
  const columnOrder = useBoardStore((s) => s.columnOrder);
  const columns = useBoardStore((s) => s.columns);
  const cardsByColumn = useBoardStore((s) => s.cardsByColumn);
  const cardsMap = useBoardStore((s) => s.cards);
  const presence = useBoardStore((s) => s.presence);
  const activity = useBoardStore((s) => s.activity);
  const draggingId = useBoardStore((s) => s.draggingCardId);
  const setDragging = useBoardStore((s) => s.setDragging);

  const presenceUsers = useMemo(() => Object.values(presence), [presence]);

  const [adding, setAdding] = useState(false);
  const [newColTitle, setNewColTitle] = useState("");
  const [openCardId, setOpenCardId] = useState<string | null>(null);

  const actions = useBoardActions(id);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragStart = useCallback(
    (event: DragStartEvent) => {
      const id = String(event.active.id);
      if (cardsMap[id]) setDragging(id);
    },
    [cardsMap, setDragging],
  );

  const handleDragEnd = useCallback(
    async (event: DragEndEvent) => {
      setDragging(null);
      const { active, over } = event;
      if (!over) return;
      const activeId = String(active.id);
      const card = cardsMap[activeId];
      if (!card) return;

      // Figure out destination column + index.
      const overData = over.data.current as { type?: string; columnId?: string } | undefined;
      let toColumnId: string;
      let toPosition: number;

      if (overData?.type === "column" && overData.columnId) {
        toColumnId = overData.columnId;
        toPosition = (cardsByColumn[toColumnId] ?? []).length;
      } else {
        // Over another card - drop above it.
        const overId = String(over.id);
        const overCard = cardsMap[overId];
        if (!overCard) return;
        toColumnId = overCard.columnId;
        const dest = cardsByColumn[toColumnId] ?? [];
        const overIndex = dest.indexOf(overId);
        toPosition = Math.max(0, overIndex);
      }

      // No-op move
      if (card.columnId === toColumnId) {
        const dest = cardsByColumn[toColumnId] ?? [];
        const currentIndex = dest.indexOf(card.id);
        if (currentIndex === toPosition || currentIndex === toPosition - 1) return;
      }

      await actions.moveCard({
        cardId: card.id,
        toColumnId,
        toPosition,
        version: card.version,
      });
    },
    [actions, cardsByColumn, cardsMap, setDragging],
  );

  const handleAddCard = useCallback(
    (columnId: string, title: string) => {
      void actions.createCard({ columnId, title });
    },
    [actions],
  );
  const handleRenameColumn = useCallback(
    (columnId: string, title: string) => {
      void actions.updateColumn(columnId, title);
    },
    [actions],
  );
  const handleDeleteColumn = useCallback(
    (columnId: string) => {
      void actions.deleteColumn(columnId);
    },
    [actions],
  );

  if (roomQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (roomQuery.isError || !roomQuery.data) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-600">
        Room not found.
      </div>
    );
  }
  const room = roomQuery.data.room;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <header className="flex shrink-0 items-center justify-between gap-4 border-b border-slate-200 bg-white px-6 py-3">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Room
          </div>
          <h1 className="truncate text-lg font-semibold tracking-tight">{room.name}</h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              const url = `${window.location.origin}/app/join`;
              void navigator.clipboard.writeText(room.code);
              toast.success(`Code "${room.code}" copied. Share at ${url}`);
            }}
            className="btn-secondary text-xs"
            title="Copy room code"
          >
            <span className="font-mono">{room.code}</span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
            </svg>
          </button>
          <PresenceBar users={presenceUsers} />
        </div>
      </header>

      <div className="grid min-h-0 flex-1 grid-cols-[1fr_280px]">
        <div className="min-w-0 overflow-hidden">
          {!loaded ? (
            <div className="flex h-full items-center justify-center">
              <Spinner />
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCorners}
              onDragStart={handleDragStart}
              onDragEnd={handleDragEnd}
            >
              <div className="scrollbar-thin flex h-full gap-4 overflow-x-auto overflow-y-hidden p-4">
                <SortableContext items={columnOrder} strategy={horizontalListSortingStrategy}>
                  {columnOrder.map((colId) => {
                    const col = columns[colId];
                    if (!col) return null;
                    const cardIds = cardsByColumn[colId] ?? [];
                    const cards = cardIds
                      .map((cid) => cardsMap[cid])
                      .filter((c): c is BoardCard => Boolean(c));
                    return (
                      <ColumnView
                        key={colId}
                        column={col}
                        cards={cards}
                        onAddCard={handleAddCard}
                        onRenameColumn={handleRenameColumn}
                        onDeleteColumn={handleDeleteColumn}
                        onOpenCard={setOpenCardId}
                      />
                    );
                  })}
                </SortableContext>

                <div className="flex h-min w-72 shrink-0 flex-col gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white/30 p-3 text-sm">
                  {adding ? (
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        const v = newColTitle.trim();
                        if (!v) return;
                        void actions.createColumn(v);
                        setNewColTitle("");
                        setAdding(false);
                      }}
                      className="space-y-2"
                    >
                      <input
                        autoFocus
                        value={newColTitle}
                        onChange={(e) => setNewColTitle(e.target.value)}
                        className="input"
                        placeholder="Column title"
                        onKeyDown={(e) => e.key === "Escape" && setAdding(false)}
                      />
                      <div className="flex items-center gap-2">
                        <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
                          Add column
                        </button>
                        <button
                          type="button"
                          onClick={() => setAdding(false)}
                          className="btn-ghost px-3 py-1.5 text-xs"
                        >
                          Cancel
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      className="flex w-full items-center justify-center gap-2 rounded-md py-2 text-slate-600 hover:bg-white"
                      onClick={() => setAdding(true)}
                    >
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M12 5v14M5 12h14" />
                      </svg>
                      Add column
                    </button>
                  )}
                </div>
              </div>

              <DragOverlay>
                {draggingId && cardsMap[draggingId] ? (
                  <CardItem
                    card={cardsMap[draggingId]!}
                    onOpen={() => undefined}
                    isOverlay
                  />
                ) : null}
              </DragOverlay>
            </DndContext>
          )}
        </div>

        <aside className="flex h-full min-h-0 flex-col border-l border-slate-200 bg-white">
          <ActivityFeed items={activity} />
        </aside>
      </div>

      <CardDetailModal
        roomId={id}
        cardId={openCardId}
        onClose={() => setOpenCardId(null)}
      />
    </div>
  );
}
