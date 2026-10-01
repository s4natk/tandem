import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { workspacesApi } from "@/api/endpoints";
import { Spinner } from "@/components/ui/Spinner";

export function NewWorkspacePage(): JSX.Element {
  const [name, setName] = useState("");
  const navigate = useNavigate();
  const qc = useQueryClient();
  const create = useMutation({
    mutationFn: (n: string) => workspacesApi.create(n),
    onSuccess: ({ workspace }) => {
      qc.invalidateQueries({ queryKey: ["workspaces"] });
      navigate(`/app/workspaces/${workspace.id}`, { replace: true });
    },
    onError: (err) => {
      toast.error((err as { message?: string }).message ?? "Could not create workspace");
    },
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mx-auto max-w-lg">
        <h1 className="text-2xl font-semibold tracking-tight">New workspace</h1>
        <p className="mt-1 text-slate-600">
          A workspace contains your team's rooms (boards).
        </p>
        <form
          className="card-surface mt-6 space-y-4 p-6"
          onSubmit={(e) => {
            e.preventDefault();
            if (name.trim().length === 0) return;
            create.mutate(name.trim());
          }}
        >
          <div>
            <label className="block text-sm font-medium text-slate-700">
              Workspace name
            </label>
            <input
              className="input mt-1"
              required
              maxLength={80}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Acme Engineering"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={create.isPending || name.trim().length === 0}
              className="btn-primary"
            >
              {create.isPending ? <Spinner size="sm" className="text-white" /> : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
