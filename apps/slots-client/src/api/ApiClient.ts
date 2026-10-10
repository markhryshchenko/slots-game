import type { GameRules, Limits, Profile, SpinResult } from "./types.js";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface LaunchParams {
  token: string;
  cid: string;
  gameId: string;
  currency?: string;
}

/**
 * HTTP layer over the game API. URLs are relative: in dev Vite proxies /v1 to
 * the API, in production the client is served next to it.
 */
export class ApiClient {
  private sessionToken: string | undefined;

  async launch(params: LaunchParams): Promise<Profile> {
    const profile = await this.request<Profile>("POST", "/v1/profile", params, false);
    this.sessionToken = profile.sessionToken;
    return profile;
  }

  gameRules(gameId: string): Promise<GameRules> {
    return this.request<GameRules>("GET", `/v1/games/${encodeURIComponent(gameId)}`, undefined, false);
  }

  limits(): Promise<Limits> {
    return this.request<Limits>("GET", "/v1/limits");
  }

  spin(gameId: string, bet: number): Promise<SpinResult> {
    return this.request<SpinResult>("POST", `/v1/games/${encodeURIComponent(gameId)}/spin`, { bet });
  }

  async realtimeToken(): Promise<string> {
    return (await this.request<{ token: string }>("POST", "/v1/realtime/token", {})).token;
  }

  async logout(): Promise<void> {
    await this.request<void>("POST", "/v1/logout", {});
    this.sessionToken = undefined;
  }

  private async request<T>(
    method: "GET" | "POST",
    path: string,
    body?: unknown,
    authorized = true,
  ): Promise<T> {
    const headers: Record<string, string> = {};

    if (body !== undefined) headers["Content-Type"] = "application/json";

    if (authorized) {
      if (!this.sessionToken) throw new ApiError(401, "Not launched");
      headers.Authorization = `Bearer ${this.sessionToken}`;
    }

    const response = await fetch(path, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });

    if (response.status === 204) return undefined as T;

    // Every API error is JSON {"error": "..."}.
    const payload: unknown = await response.json().catch(() => undefined);

    if (!response.ok) {
      const message =
        typeof payload === "object" && payload !== null && "error" in payload
          ? String(payload.error)
          : `HTTP ${response.status}`;
      throw new ApiError(response.status, message);
    }

    return payload as T;
  }
}
