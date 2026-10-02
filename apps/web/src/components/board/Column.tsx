import { useState } from "react";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { useDroppable } from "@dnd-kit/core";
import type { BoardCard, BoardColumn } from "@collab/shared";
import { CardItem } from "./Card";
import { cn } from "@/lib/cn";

interface Props {
  column: BoardColumn;
  cards: BoardCard[];
  readOnly?: boolean;
  onAddCard: (columnId: string, title: string) => void;
  onRenameColumn: (columnId: string, title: string) => void;
  onDeleteColumn: (columnId: string) => void;
  onOpenCard: (cardId: string) => void;
}

export function ColumnView({
  column,
  cards,
  readOnly = false,
  onAddCard,
  onRenameColumn,
  onDeleteColumn,
  onOpenCard,
}: Props): JSX.Element {
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(column.title);

  const { setNodeRef, isOver } = useDroppable({
    id: column.id,
    data: { type: "column", columnId: column.id },
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex h-full w-72 shrink-0 flex-col rounded-lg bg-slate-100/80 backdrop-blur transition-colors",
        isOver && "bg-brand-100/60 ring-2 ring-brand-300",
      )}
    >
      <header className="flex items-center gap-2 px-3 pb-2 pt-3">
        {editing ? (
          <input
            autoFocus
            value={editValue}
            onChange={(e) => setEditValue(e.target.value)}
            onBlur={() => {
              setEditing(false);
              const v = editValue.trim();
              if (v && v !== column.title) onRenameColumn(column.id, v);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") (e.target as HTMLInputElement).blur();
              if (e.key === "Escape") {
                setEditValue(column.title);
                setEditing(false);
              }
            }}
            className="input h-7 px-2 py-0 text-sm font-semibold"
          />
        ) : readOnly ? (
          <div className="flex-1 text-left text-sm font-semibold uppercase tracking-wider text-slate-600">
            {column.title}
          </div>
        ) : (
          <button
            onClick={() => setEditing(true)}
            className="flex-1 text-left text-sm font-semibold uppercase tracking-wider text-slate-600 hover:text-slate-900"
          >
            {column.title}
          </button>
        )}
        <span className="rounded-md bg-slate-200/80 px-1.5 py-0.5 text-[11px] font-medium text-slate-600">
          {cards.length}
        </span>
        {!readOnly && (
          <button
            onClick={() => {
              if (
                window.confirm(
                  `Delete column "${column.title}"? All cards in it will be removed.`,
                )
              ) {
                onDeleteColumn(column.id);
              }
            }}
            className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-rose-600"
            title="Delete column"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="3 6 5 6 21 6" />
              <path d="M19 6l-2 14a2 2 0 01-2 2H9a2 2 0 01-2-2L5 6" />
              <path d="M10 11v6M14 11v6" />
            </svg>
          </button>
        )}
      </header>

      <div className="scrollbar-thin flex-1 space-y-2 overflow-y-auto px-2 pb-2">
        <SortableContext items={cards.map((c) => c.id)} strategy={verticalListSortingStrategy}>
          {cards.map((card) => (
            <CardItem key={card.id} card={card} onOpen={onOpenCard} readOnly={readOnly} />
          ))}
        </SortableContext>
      </div>

      {!readOnly && (
      <div className="border-t border-slate-200/80 p-2">
        {adding ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = title.trim();
              if (!v) return;
              onAddCard(column.id, v);
              setTitle("");
              setAdding(false);
            }}
            className="space-y-2"
          >
            <input
              autoFocus
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Card title"
              className="input"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setAdding(false);
                  setTitle("");
                }
              }}
            />
            <div className="flex items-center gap-2">
              <button type="submit" className="btn-primary px-3 py-1.5 text-xs">
                Add
              </button>
              <button
                type="button"
                onClick={() => {
                  setAdding(false);
                  setTitle("");
                }}
                className="btn-ghost px-3 py-1.5 text-xs"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setAdding(true)}
            className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-sm text-slate-600 hover:bg-slate-200/70"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            Add a card
          </button>
        )}
      </div>
      )}
    </div>
  );
}
