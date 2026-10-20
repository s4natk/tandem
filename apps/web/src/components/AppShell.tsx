import { Suspense } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { workspacesApi } from "@/api/endpoints";
import { Avatar } from "@/components/ui/Avatar";
import { Spinner } from "@/components/ui/Spinner";
import { useAuthStore } from "@/store/auth";
import { authApi } from "@/api/endpoints";
import { closeSocket } from "@/realtime/socket";
import { useBoardStore } from "@/store/board";
import { TandemLogo } from "@/components/brand/TandemLogo";
import { cn } from "@/lib/cn";

export function AppShell(): JSX.Element {
  const user = useAuthStore((s) => s.user);
  const refreshToken = useAuthStore((s) => s.refreshToken);
  const clear = useAuthStore((s) => s.clear);
  const resetBoard = useBoardStore((s) => s.reset);
  const navigate = useNavigate();

  const wsQuery = useQuery({
    queryKey: ["workspaces"],
    queryFn: workspacesApi.list,
  });

  const handleLogout = async (): Promise<void> => {
    try {
      if (refreshToken) await authApi.logout(refreshToken);
    } catch {
      // ignore - we always clear state below
    }
    closeSocket();
    resetBoard();
    clear();
    navigate("/login", { replace: true });
  };

  return (
    <div className="grid h-full grid-cols-[260px_1fr] bg-slate-50">
      <aside className="relative flex flex-col overflow-hidden border-r border-white/[0.06] bg-ink-900 text-white/75">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-[radial-gradient(ellipse_at_top,rgba(114,98,251,0.28),transparent_70%)]" />
        <Link
          to="/app"
          className="relative flex items-center gap-2.5 px-5 py-4 outline-none focus-visible:ring-2 focus-visible:ring-brand-300"
        >
          <TandemLogo />
        </Link>

        <nav className="relative flex-1 space-y-1 px-3">
          <SidebarLink to="/app" end label="Home" icon={IconHome} />

          <div className="pt-4">
            <div className="flex items-center justify-between px-2 pb-1 text-xs font-semibold uppercase tracking-wider text-white/35">
              Workspaces
              <Link
                to="/app/new"
                className="rounded-md p-1 text-white/45 transition hover:bg-white/10 hover:text-white"
                title="New workspace"
              >
                <IconPlus />
              </Link>
            </div>
            {wsQuery.isLoading && (
              <div className="flex items-center gap-2 px-2 py-3 text-sm text-white/45">
                <Spinner size="sm" className="text-brand-300" /> Loading…
              </div>
            )}
            {wsQuery.data?.workspaces.map((ws) => (
              <SidebarLink
                key={ws.id}
                to={`/app/workspaces/${ws.id}`}
                label={ws.name}
                icon={IconFolder}
              />
            ))}
            {wsQuery.data && wsQuery.data.workspaces.length === 0 && (
              <div className="px-2 py-2 text-xs text-white/40">
                No workspaces yet
              </div>
            )}
          </div>

          <div className="pt-4">
            <SidebarLink to="/app/join" label="Join by code" icon={IconLink} />
          </div>
        </nav>

        {user && (
          <div className="relative flex items-center gap-3 border-t border-white/[0.06] px-4 py-3">
            <Avatar name={user.name} color={user.avatarColor} size="sm" className="ring-ink-900" />
            <div className="flex-1 overflow-hidden">
              <div className="truncate text-sm font-medium text-white">{user.name}</div>
              <div className="truncate text-xs text-white/45">{user.email}</div>
            </div>
            <button
              onClick={handleLogout}
              className="rounded-md p-2 text-white/45 transition hover:bg-white/10 hover:text-white"
              title="Sign out"
            >
              <IconLogout />
            </button>
          </div>
        )}
      </aside>

      <main className="flex h-full min-w-0 flex-col overflow-hidden">
        <Suspense
          fallback={
            <div className="flex flex-1 items-center justify-center">
              <Spinner />
            </div>
          }
        >
          <Outlet />
        </Suspense>
      </main>
    </div>
  );
}

function SidebarLink({
  to,
  end,
  label,
  icon: Icon,
}: {
  to: string;
  end?: boolean;
  label: string;
  icon: () => JSX.Element;
}): JSX.Element {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors",
          isActive
            ? "bg-white/10 text-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]"
            : "text-white/65 hover:bg-white/[0.06] hover:text-white",
        )
      }
    >
      <Icon />
      <span className="truncate">{label}</span>
    </NavLink>
  );
}

function IconHome(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9.5L12 3l9 6.5V20a1 1 0 01-1 1h-5v-7H9v7H4a1 1 0 01-1-1V9.5z" />
    </svg>
  );
}
function IconFolder(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 7a2 2 0 012-2h4l2 3h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
    </svg>
  );
}
function IconLink(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" />
    </svg>
  );
}
function IconPlus(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IconLogout(): JSX.Element {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4" />
      <path d="M16 17l5-5-5-5" />
      <path d="M21 12H9" />
    </svg>
  );
}
