import { useEffect } from "react";
import { authApi } from "@/api/endpoints";
import { useAuthStore } from "@/store/auth";

/**
 * Runs once at app startup:
 *   - If a token is present, validate it against /api/auth/me
 *   - On 401 the api client will already have rotated through /auth/refresh
 *     (or cleared the store) before this returns.
 */
export function useBootstrapAuth(): void {
  useEffect(() => {
    const { accessToken, refreshToken, setUser, clear } = useAuthStore.getState();
    if (!accessToken && !refreshToken) {
      useAuthStore.setState({ status: "anonymous" });
      return;
    }
    useAuthStore.setState({ status: "loading" });
    authApi
      .me()
      .then(({ user }) => {
        setUser(user);
        useAuthStore.setState({ status: "authenticated" });
      })
      .catch(() => {
        clear();
      });
  }, []);
}
