import { Navigate, Route, Routes } from "react-router-dom";
import { useBootstrapAuth } from "@/auth/useBootstrapAuth";
import { RequireAuth } from "@/auth/RequireAuth";
import { AppShell } from "@/components/AppShell";
import { BoardPage } from "@/pages/BoardPage";
import { HomePage } from "@/pages/HomePage";
import { JoinByCodePage } from "@/pages/JoinByCodePage";
import { LoginPage } from "@/pages/LoginPage";
import { NewWorkspacePage } from "@/pages/NewWorkspacePage";
import { SignupPage } from "@/pages/SignupPage";
import { WorkspacePage } from "@/pages/WorkspacePage";

export default function App(): JSX.Element {
  useBootstrapAuth();

  return (
    <Routes>
      <Route path="/" element={<Navigate to="/app" replace />} />
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
      <Route path="*" element={<Navigate to="/app" replace />} />
    </Routes>
  );
}
