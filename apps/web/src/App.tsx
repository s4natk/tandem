import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { useBootstrapAuth } from "@/auth/useBootstrapAuth";
import { RequireAuth } from "@/auth/RequireAuth";
import { Spinner } from "@/components/ui/Spinner";
import { LandingPage } from "@/pages/LandingPage";
import { LoginPage } from "@/pages/LoginPage";
import { SignupPage } from "@/pages/SignupPage";

const loadApp = () => import("@/appRoutes");
const AppShell = lazy(() => loadApp().then((m) => ({ default: m.AppShell })));
const HomePage = lazy(() => loadApp().then((m) => ({ default: m.HomePage })));
const NewWorkspacePage = lazy(() => loadApp().then((m) => ({ default: m.NewWorkspacePage })));
const JoinByCodePage = lazy(() => loadApp().then((m) => ({ default: m.JoinByCodePage })));
const WorkspacePage = lazy(() => loadApp().then((m) => ({ default: m.WorkspacePage })));
const BoardPage = lazy(() => loadApp().then((m) => ({ default: m.BoardPage })));

function RouteFallback(): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center bg-ink-900">
      <Spinner className="text-brand-300" />
    </div>
  );
}

export default function App(): JSX.Element {
  useBootstrapAuth();

  return (
    <Suspense fallback={<RouteFallback />}>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />
        <Route
          path="/app"
          element={
            <RequireAuth>
              <AppShell />
            </RequireAuth>
          }
        >
          <Route index element={<HomePage />} />
          <Route path="new" element={<NewWorkspacePage />} />
          <Route path="join" element={<JoinByCodePage />} />
          <Route path="workspaces/:id" element={<WorkspacePage />} />
          <Route path="rooms/:id" element={<BoardPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
