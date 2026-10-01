import type { ApiError, AuthResponse } from "@collab/shared";
import { env } from "@/lib/env";
import { useAuthStore } from "@/store/auth";

export class ApiClientError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
    public readonly details?: unknown,
  ) {
    super(message);
  }
}

interface RequestOptions extends RequestInit {
  json?: unknown;
  auth?: boolean;
  /** Skip the automatic refresh-token rotation on 401 (used by /auth/refresh). */
  skipRefresh?: boolean;
}

let refreshInFlight: Promise<AuthResponse> | null = null;

/**
 * Single-flight refresh: if multiple requests race a 401 we only fire one
 * refresh call and let everyone else await its result.
 */
async function refreshSession(): Promise<AuthResponse> {
  if (refreshInFlight) return refreshInFlight;
  const { refreshToken, clear, setSession } = useAuthStore.getState();
  if (!refreshToken) throw new ApiClientError(401, "UNAUTHORIZED", "Session expired");
  refreshInFlight = (async () => {
    try {
      const resp = await request<AuthResponse>("/api/auth/refresh", {
        method: "POST",
        json: { refreshToken },
        auth: false,
        skipRefresh: true,
      });
      setSession({
        user: resp.user,
        accessToken: resp.accessToken,
        refreshToken: resp.refreshToken,
      });
      return resp;
    } catch (err) {
      clear();
      throw err;
    } finally {
      refreshInFlight = null;
    }
  })();
  return refreshInFlight;
}

async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const { json, auth = true, skipRefresh = false, headers, ...init } = opts;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...(headers as Record<string, string> | undefined),
  };
  if (json !== undefined) {
    requestHeaders["Content-Type"] = "application/json";
  }
  if (auth) {
    const token = useAuthStore.getState().accessToken;
    if (token) requestHeaders["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${env.apiUrl}${path}`, {
    ...init,
    headers: requestHeaders,
    body: json !== undefined ? JSON.stringify(json) : init.body,
  });

  if (res.status === 401 && auth && !skipRefresh) {
    try {
      await refreshSession();
      return request<T>(path, { ...opts, skipRefresh: true });
    } catch {
      // Fall through to throw the original 401 below.
    }
  }

  if (res.status === 204) return undefined as T;

  const text = await res.text();
  const body = text ? (JSON.parse(text) as T | ApiError) : (undefined as T);

  if (!res.ok) {
    const err = body as ApiError | undefined;
    throw new ApiClientError(
      res.status,
      err?.error?.code ?? "REQUEST_FAILED",
      err?.error?.message ?? `Request failed with status ${res.status}`,
      err?.error?.details,
    );
  }

  return body as T;
}

export const api = {
  get: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "GET" }),
  post: <T>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "POST", json }),
  patch: <T>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PATCH", json }),
  put: <T>(path: string, json?: unknown, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "PUT", json }),
  delete: <T>(path: string, opts?: RequestOptions) =>
    request<T>(path, { ...opts, method: "DELETE" }),
};
