import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { roomsApi } from "@/api/endpoints";
import { Spinner } from "@/components/ui/Spinner";

export function JoinByCodePage(): JSX.Element {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const join = useMutation({
    mutationFn: (c: string) => roomsApi.joinByCode(c),
    onSuccess: ({ room }) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      qc.invalidateQueries({ queryKey: ["rooms", room.workspaceId] });
      navigate(`/app/rooms/${room.id}`, { replace: true });
    },
    onError: (err) => {
      toast.error((err as { message?: string }).message ?? "Room code not found");
    },
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight">Join by room code</h1>
        <p className="mt-1 text-slate-600">
          Paste a shared room code to join the board instantly.
        </p>
        <form
          className="card-surface mt-6 space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (code.trim().length === 0) return;
            join.mutate(code.trim().toLowerCase());
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Room code
            </label>
            <input
              className="input mt-1 font-mono tracking-widest"
              required
              minLength={6}
              maxLength={12}
              autoFocus
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. k7m2x4qp"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={join.isPending || code.trim().length === 0}
              className="btn-primary"
            >
              {join.isPending ? <Spinner size="sm" className="text-white" /> : "Join room"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
