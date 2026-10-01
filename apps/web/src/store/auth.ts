import type { PublicUser } from "@collab/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
  user: PublicUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: "idle" | "loading" | "authenticated" | "anonymous";
  setSession: (args: {
    user: PublicUser;
    accessToken: string;
    refreshToken: string;
  }) => void;
  setUser: (user: PublicUser) => void;
  setAccessToken: (token: string) => void;
  clear: () => void;
}

/**
 * Auth store. Persisted to localStorage so a refresh keeps the user signed
 * in. The bootstrap effect (App.tsx) revalidates the token on mount and
 * triggers a refresh-token rotation if the access token is expired.
 */
export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      status: "idle",
      setSession: ({ user, accessToken, refreshToken }) =>
        set({ user, accessToken, refreshToken, status: "authenticated" }),
      setUser: (user) => set({ user }),
      setAccessToken: (token) => set({ accessToken: token }),
      clear: () =>
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          status: "anonymous",
        }),
    }),
    {
      name: "collab.auth",
      partialize: (state) => ({
        user: state.user,
        accessToken: state.accessToken,
        refreshToken: state.refreshToken,
      }),
    },
  ),
);
