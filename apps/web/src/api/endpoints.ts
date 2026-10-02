import type {
  Activity,
  AuthResponse,
  BoardSnapshot,
  LoginInput,
  PublicUser,
  Room,
  MembershipRole,
  SignupInput,
  Workspace,
} from "@collab/shared";
import { api } from "./client";

export interface WorkspaceWithRole extends Workspace {
  role: "OWNER" | "EDITOR" | "VIEWER";
}
export interface RoomWithRole extends Room {
  role: "OWNER" | "EDITOR" | "VIEWER";
}
export interface RoomMemberView {
  id: string;
  role: "OWNER" | "EDITOR" | "VIEWER";
  joinedAt: string;
  user: {
    id: string;
    name: string;
    email: string;
    avatarColor: string;
  };
}

export const authApi = {
  signup: (input: SignupInput) =>
    api.post<AuthResponse>("/api/auth/signup", input, { auth: false }),
  login: (input: LoginInput) =>
    api.post<AuthResponse>("/api/auth/login", input, { auth: false }),
  logout: (refreshToken: string) =>
    api.post<void>("/api/auth/logout", { refreshToken }, { auth: false }),
  me: () => api.get<{ user: PublicUser }>("/api/auth/me"),
};

export const workspacesApi = {
  list: () => api.get<{ workspaces: WorkspaceWithRole[] }>("/api/workspaces"),
  create: (name: string) =>
    api.post<{ workspace: WorkspaceWithRole }>("/api/workspaces", { name }),
  get: (id: string) =>
    api.get<{ workspace: WorkspaceWithRole }>(`/api/workspaces/${id}`),
};

export const roomsApi = {
  list: (workspaceId: string) =>
    api.get<{ rooms: RoomWithRole[] }>(
      `/api/workspaces/${workspaceId}/rooms`,
    ),
  create: (args: { workspaceId: string; name: string; description?: string }) =>
    api.post<{ room: RoomWithRole }>("/api/rooms", args),
  get: (id: string) => api.get<{ room: RoomWithRole }>(`/api/rooms/${id}`),
  members: (id: string) =>
    api.get<{ members: RoomMemberView[] }>(`/api/rooms/${id}/members`),
  updateMemberRole: (roomId: string, userId: string, role: MembershipRole) =>
    api.patch<{ member: RoomMemberView }>(`/api/rooms/${roomId}/members/${userId}`, {
      role,
    }),
  joinByCode: (code: string) =>
    api.post<{ room: RoomWithRole }>("/api/rooms/join", { code }),
};

export const boardApi = {
  snapshot: (roomId: string) =>
    api.get<{ snapshot: BoardSnapshot }>(`/api/rooms/${roomId}/board`),
  activity: (roomId: string, limit = 50) =>
    api.get<{ activity: Activity[] }>(
      `/api/rooms/${roomId}/activity?limit=${limit}`,
    ),
};
