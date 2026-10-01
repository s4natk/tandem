import { memo, useState } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { BoardCard } from "@collab/shared";
import { Avatar } from "@/components/ui/Avatar";
import { useBoardStore } from "@/store/board";
import { cn } from "@/lib/cn";

interface Props {
  card: BoardCard;
  onOpen: (cardId: string) => void;
  isOverlay?: boolean;
}

export const CardItem = memo(function CardItem({
  card,
  onOpen,
  isOverlay = false,
}: Props): JSX.Element {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id, data: { type: "card", card } });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging && !isOverlay ? 0 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={() => onOpen(card.id)}
      className={cn(
        "group relative cursor-pointer rounded-md border border-slate-200 bg-white p-3 shadow-card transition-shadow hover:shadow-elevated",
        isOverlay && "shadow-elevated ring-2 ring-brand-400",
      )}
    >
      <CardActivePresenceRing cardId={card.id} />
      <div className="line-clamp-3 text-sm font-medium text-slate-900">
        {card.title}
      </div>
      {card.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{card.description}</p>
      )}
      {card.assigneeId && <AssigneeBadge userId={card.assigneeId} />}
    </div>
  );
});

function CardActivePresenceRing({ cardId }: { cardId: string }): JSX.Element | null {
  const presence = useBoardStore((s) => s.presence);
  const activeByUser = useBoardStore((s) => s.activeCardByUser);
  const watchers = Object.values(presence).filter(
    (p) => activeByUser[p.userId] === cardId,
  );
  if (watchers.length === 0) return null;
  return (
    <div className="absolute -top-2 -right-2 flex -space-x-1.5">
      {watchers.slice(0, 3).map((u) => (
        <Watcher key={u.userId} name={u.name} color={u.avatarColor} />
      ))}
    </div>
  );
}

function Watcher({ name, color }: { name: string; color: string }): JSX.Element {
  return (
    <span
      title={`${name} is viewing this card`}
      className="inline-flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-semibold text-white ring-2 ring-white"
      style={{ backgroundColor: color }}
    >
      {name.charAt(0).toUpperCase()}
    </span>
  );
}

function AssigneeBadge({ userId }: { userId: string }): JSX.Element {
  const presence = useBoardStore((s) => s.presence);
  const member = Object.values(presence).find((p) => p.userId === userId);
  return (
    <div className="mt-2 flex justify-end">
      <Avatar
        name={member?.name ?? "?"}
        color={member?.avatarColor ?? "#94a3b8"}
        size="xs"
      />
    </div>
  );
}

CardItem.displayName = "CardItem";
