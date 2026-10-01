const apiUrl = import.meta.env.VITE_API_URL ?? "http://localhost:4000";
const wsUrl = import.meta.env.VITE_WS_URL ?? apiUrl;

export const env = {
  apiUrl,
  wsUrl,
} as const;
