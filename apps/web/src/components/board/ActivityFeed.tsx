import { useEffect, useRef } from "react";
import type { Activity } from "@collab/shared";
import { cn } from "@/lib/cn";

interface Props {
  items: Activity[];
}

export function ActivityFeed({ items }: Props): JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  // Auto-scroll to latest activity.
  useEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [items.length]);

  return (
    <div className="flex h-full flex-col">
      <div className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Activity
      </div>
      <div
        ref={scrollRef}
        className="scrollbar-thin flex-1 space-y-1 overflow-y-auto px-2 pb-4"
      >
        {items.length === 0 && (
          <p className="px-2 py-4 text-sm text-slate-500">
            No activity yet. Create or move a card to get started.
          </p>
        )}
        {items.map((a) => (
          <ActivityRow key={a.id} activity={a} />
        ))}
      </div>
    </div>
  );
}

function ActivityRow({ activity: a }: { activity: Activity }): JSX.Element {
  const { description, color } = describe(a);
  const time = new Date(a.createdAt).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
  return (
    <div className="group flex items-start gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50 animate-fade-in">
      <span className={cn("mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full", color)} />
      <div className="min-w-0 flex-1">
        <span className="font-medium text-slate-900">{a.actorName}</span>{" "}
        <span className="text-slate-700">{description}</span>
        <div className="text-xs text-slate-400">{time}</div>
      </div>
    </div>
  );
}

function describe(a: Activity): { description: string; color: string } {
  const title = (a.payload?.title as string | undefined) ?? "(untitled)";
  switch (a.kind) {
    case "ROOM_CREATED":
      return { description: "created the room", color: "bg-slate-400" };
    case "MEMBER_JOINED":
      return { description: "joined the room", color: "bg-emerald-500" };
    case "COLUMN_CREATED":
      return { description: `added column "${title}"`, color: "bg-brand-500" };
    case "COLUMN_UPDATED":
      return { description: `renamed column to "${title}"`, color: "bg-brand-400" };
    case "COLUMN_DELETED":
      return { description: `deleted column "${title}"`, color: "bg-rose-500" };
    case "CARD_CREATED":
      return { description: `added card "${title}"`, color: "bg-brand-500" };
    case "CARD_UPDATED":
      return { description: `updated "${title}"`, color: "bg-amber-500" };
    case "CARD_MOVED":
      return { description: `moved "${title}"`, color: "bg-blue-500" };
    case "CARD_DELETED":
      return { description: `deleted "${title}"`, color: "bg-rose-500" };
    default: {
      const fallback = String(a.kind).toLowerCase().replace(/_/g, " ");
      return { description: fallback, color: "bg-slate-400" };
    }
  }
}
