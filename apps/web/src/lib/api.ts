const TOKEN_KEY = "libhub_token";

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  details?: unknown;
  constructor(status: number, message: string, details?: unknown) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

interface RequestOptions {
  method?: string;
  body?: unknown;
  // When true, sends body as-is (e.g. FormData) without JSON serialization.
  raw?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", body, raw = false } = options;
  const headers: Record<string, string> = {};
  const token = getToken();
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let payload: BodyInit | undefined;
  if (body !== undefined) {
    if (raw) {
      payload = body as BodyInit;
    } else {
      headers["Content-Type"] = "application/json";
      payload = JSON.stringify(body);
    }
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });

  if (res.status === 204) {
    return undefined as T;
  }

  const contentType = res.headers.get("content-type") ?? "";
  const data = contentType.includes("application/json") ? await res.json() : await res.text();

  if (!res.ok) {
    const message = typeof data === "object" && data?.error ? data.error : `Request failed (${res.status})`;
    throw new ApiError(res.status, message, typeof data === "object" ? data?.details : undefined);
  }

  return data as T;
}

// Direct download URL. Token is appended so the browser can navigate to it.
export function downloadUrl(versionId: number): string {
  const token = getToken();
  const base = `/api/download/${versionId}`;
  return token ? `${base}?token=${encodeURIComponent(token)}` : base;
}
