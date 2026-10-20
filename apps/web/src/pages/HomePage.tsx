import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { workspacesApi } from "@/api/endpoints";
import { CruisingBike } from "@/components/brand/TandemBike";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/auth";

export function HomePage(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const wsQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
  });

  return (
    <div className="flex-1 overflow-y-auto px-8 py-10">
      <div className="mx-auto max-w-4xl">
        <header className="relative mb-8 overflow-hidden rounded-3xl bg-ink-900 px-7 py-8 text-white shadow-[0_24px_60px_-30px_rgba(10,9,32,0.9)]">
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_90%_at_85%_0%,rgba(114,98,251,0.45),transparent_60%),radial-gradient(ellipse_50%_60%_at_0%_100%,rgba(217,70,239,0.15),transparent_60%)]" />
          <div className="relative flex items-center justify-between gap-6">
            <div>
              <h1 className="font-display text-3xl font-bold tracking-tight">
                Welcome back{user ? `, ${user.name.split(" ")[0]}` : ""}
              </h1>
              <p className="mt-1.5 text-white/60">
                Open a workspace, jump into a board, or create something new.
              </p>
            </div>
            <CruisingBike degreesPerSecond={200} className="hidden w-52 shrink-0 sm:block" />
          </div>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Link
            to="/app/new"
            className="card-surface flex flex-col items-start gap-2 p-5 transition-all hover:shadow-elevated"
          >
            <div className="rounded-md bg-brand-50 p-2 text-brand-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 5v14M5 12h14" />
              </svg>
            </div>
            <div className="font-medium">Create workspace</div>
            <div className="text-sm text-slate-600">
              Start a fresh workspace for your team or project.
            </div>
          </Link>

          <Link
            to="/app/join"
            className="card-surface flex flex-col items-start gap-2 p-5 transition-all hover:shadow-elevated"
          >
            <div className="rounded-md bg-emerald-50 p-2 text-emerald-600">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
                <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
              </svg>
            </div>
            <div className="font-medium">Join by room code</div>
            <div className="text-sm text-slate-600">
              Got an invite code? Hop into the board.
            </div>
          </Link>
        </section>

        <section className="mt-10">
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wider text-slate-500">
            Your workspaces
          </h2>
          {wsQuery.isLoading ? (
            <div className="flex items-center gap-2 text-slate-500">
              <Spinner size="sm" /> Loading workspaces…
            </div>
          ) : wsQuery.data && wsQuery.data.workspaces.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {wsQuery.data.workspaces.map((ws) => (
                <Link
                  key={ws.id}
                  to={`/app/workspaces/${ws.id}`}
                  className="card-surface flex items-center justify-between p-4 transition-all hover:shadow-elevated"
                >
                  <div>
                    <div className="font-medium">{ws.name}</div>
                    <div className="text-xs text-slate-500">
                      Role: {ws.role.toLowerCase()}
                    </div>
                  </div>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-slate-400">
                    <path d="M9 18l6-6-6-6" />
                  </svg>
                </Link>
              ))}
            </div>
          ) : (
            <div className="card-surface p-8 text-center">
              <p className="text-slate-600">You don't have any workspaces yet.</p>
              <Link to="/app/new" className="btn-primary mt-3 inline-flex">
                Create your first workspace
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
