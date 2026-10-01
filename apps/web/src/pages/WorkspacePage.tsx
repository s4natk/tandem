import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { roomsApi, workspacesApi } from "@/api/endpoints";
import { Spinner } from "@/components/ui/Spinner";
import { Modal } from "@/components/ui/Modal";

export function WorkspacePage(): JSX.Element {
  const { id = "" } = useParams<{ id: string }>();
  const wsQuery = useQuery({
    queryKey: ["workspace", id],
    queryFn: () => workspacesApi.get(id),
    enabled: Boolean(id),
  });
  const roomsQuery = useQuery({
    queryKey: ["rooms", id],
    queryFn: () => roomsApi.list(id),
    enabled: Boolean(id),
  });

  const [creating, setCreating] = useState(false);
  const qc = useQueryClient();
  const createRoom = useMutation({
    mutationFn: (args: { name: string; description?: string }) =>
      roomsApi.create({ workspaceId: id, ...args }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["rooms", id] });
      setCreating(false);
    },
    onError: (err) =>
      toast.error((err as { message?: string }).message ?? "Could not create room"),
  });

  if (wsQuery.isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Spinner />
      </div>
    );
  }
  if (wsQuery.isError || !wsQuery.data) {
    return (
      <div className="flex flex-1 items-center justify-center text-slate-600">
        Workspace not found.
      </div>
    );
  }

  const ws = wsQuery.data.workspace;

  return (
    <div className="flex-1 overflow-y-auto">
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
              Workspace
            </div>
            <h1 className="text-xl font-semibold tracking-tight">{ws.name}</h1>
          </div>
          <button
            className="btn-primary"
            onClick={() => setCreating(true)}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 5v14M5 12h14" />
            </svg>
            New room
          </button>
        </div>
      </header>

      <div className="mx-auto max-w-5xl px-8 py-8">
        {roomsQuery.isLoading ? (
          <Spinner />
        ) : roomsQuery.data && roomsQuery.data.rooms.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {roomsQuery.data.rooms.map((room) => (
              <Link
                key={room.id}
                to={`/app/rooms/${room.id}`}
                className="card-surface flex flex-col gap-2 p-4 transition-all hover:shadow-elevated"
              >
                <div className="text-base font-medium">{room.name}</div>
                {room.description && (
                  <div className="line-clamp-2 text-sm text-slate-600">
                    {room.description}
                  </div>
                )}
                <div className="mt-2 flex items-center gap-2 text-xs text-slate-500">
                  <span className="rounded-md bg-slate-100 px-1.5 py-0.5 font-mono">
                    {room.code}
                  </span>
                  <span>·</span>
                  <span className="capitalize">{room.role.toLowerCase()}</span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="card-surface p-10 text-center">
            <p className="text-slate-600">No rooms yet in this workspace.</p>
            <button
              onClick={() => setCreating(true)}
              className="btn-primary mt-3"
            >
              Create your first room
            </button>
          </div>
        )}
      </div>

      <Modal
        open={creating}
        onClose={() => setCreating(false)}
        title="New room"
      >
        <CreateRoomForm
          loading={createRoom.isPending}
          onSubmit={(values) => createRoom.mutate(values)}
          onCancel={() => setCreating(false)}
        />
      </Modal>
    </div>
  );
}

function CreateRoomForm({
  loading,
  onSubmit,
  onCancel,
}: {
  loading: boolean;
  onSubmit: (v: { name: string; description?: string }) => void;
  onCancel: () => void;
}): JSX.Element {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        if (!name.trim()) return;
        onSubmit({
          name: name.trim(),
          description: description.trim() || undefined,
        });
      }}
      className="space-y-4"
    >
      <div>
        <label className="block text-sm font-medium text-slate-700">Name</label>
        <input
          className="input mt-1"
          required
          maxLength={80}
          autoFocus
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. v1 Launch Plan"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-slate-700">
          Description <span className="text-slate-400">(optional)</span>
        </label>
        <textarea
          className="input mt-1 h-24 resize-none"
          maxLength={500}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>
      <div className="flex justify-end gap-2">
        <button type="button" onClick={onCancel} className="btn-secondary">
          Cancel
        </button>
        <button
          type="submit"
          className="btn-primary"
          disabled={loading || !name.trim()}
        >
          {loading ? <Spinner size="sm" className="text-white" /> : "Create room"}
        </button>
      </div>
    </form>
  );
}
