import type { MembershipRole } from "@collab/shared";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { roomsApi, type RoomMemberView } from "@/api/endpoints";
import { Avatar } from "@/components/ui/Avatar";

const ROLES: MembershipRole[] = ["OWNER", "EDITOR", "VIEWER"];

interface Props {
  roomId: string;
  canManage: boolean;
}

export function RoomMembers({ roomId, canManage }: Props): JSX.Element {
  const qc = useQueryClient();
  const membersQuery = useQuery({
    queryKey: ["room-members", roomId],
    queryFn: () => roomsApi.members(roomId),
    enabled: Boolean(roomId),
  });

  const updateRole = useMutation({
    mutationFn: (args: { userId: string; role: MembershipRole }) =>
      roomsApi.updateMemberRole(roomId, args.userId, args.role),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["room-members", roomId] });
      void qc.invalidateQueries({ queryKey: ["room", roomId] });
    },
    onError: (err) => {
      toast.error((err as { message?: string }).message ?? "Could not change role");
    },
  });

  const members = membersQuery.data?.members ?? [];

  return (
    <div className="shrink-0 border-b border-slate-200">
      <div className="px-4 pb-2 pt-3 text-xs font-semibold uppercase tracking-wider text-slate-500">
        Members
      </div>
      <div className="scrollbar-thin max-h-40 space-y-1 overflow-y-auto px-2 pb-3">
        {membersQuery.isLoading && (
          <p className="px-2 text-sm text-slate-500">Loading members…</p>
        )}
        {members.map((member) => (
          <MemberRow
            key={member.id}
            member={member}
            canManage={canManage}
            disabled={updateRole.isPending}
            onChange={(role) =>
              updateRole.mutate({ userId: member.user.id, role })
            }
          />
        ))}
      </div>
    </div>
  );
}

function MemberRow({
  member,
  canManage,
  disabled,
  onChange,
}: {
  member: RoomMemberView;
  canManage: boolean;
  disabled: boolean;
  onChange: (role: MembershipRole) => void;
}): JSX.Element {
  return (
    <div className="flex items-center gap-2 rounded-md px-2 py-1.5">
      <Avatar name={member.user.name} color={member.user.avatarColor} size="xs" />
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm text-slate-800">{member.user.name}</div>
      </div>
      {canManage ? (
        <select
          className="rounded-md border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-700"
          value={member.role}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value as MembershipRole)}
        >
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role.charAt(0) + role.slice(1).toLowerCase()}
            </option>
          ))}
        </select>
      ) : (
        <span className="text-xs capitalize text-slate-500">
          {member.role.toLowerCase()}
        </span>
      )}
    </div>
  );
}
