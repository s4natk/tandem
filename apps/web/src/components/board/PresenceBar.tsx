import type { PresenceUser } from "@collab/shared";
import { Avatar } from "@/components/ui/Avatar";

interface Props {
  users: PresenceUser[];
}

export function PresenceBar({ users }: Props): JSX.Element {
  // De-dupe by userId so the same user with multiple tabs still shows once.
  const byUser = new Map<string, PresenceUser>();
  for (const u of users) byUser.set(u.userId, u);
  const list = Array.from(byUser.values());

  if (list.length === 0) {
    return (
      <div className="flex items-center gap-2 text-xs text-slate-500">
        <Pulse /> Connecting…
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex -space-x-2">
        {list.slice(0, 6).map((u) => (
          <Avatar key={u.userId} name={u.name} color={u.avatarColor} size="sm" />
        ))}
        {list.length > 6 && (
          <span className="z-10 inline-flex h-8 w-8 items-center justify-center rounded-full bg-slate-200 text-xs font-semibold text-slate-700 ring-2 ring-white">
            +{list.length - 6}
          </span>
        )}
      </div>
      <span className="text-xs text-slate-500">
        {list.length} {list.length === 1 ? "person" : "people"} here
      </span>
    </div>
  );
}

function Pulse(): JSX.Element {
  return (
    <span className="relative inline-flex h-2.5 w-2.5">
      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-500" />
    </span>
  );
}
