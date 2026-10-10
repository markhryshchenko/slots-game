import type { RealtimeConnections, RealtimePublisher } from "./RealtimePublisher.js";

const API_TIMEOUT_MS = 2000;

// Centrifugo: application disconnect codes 4500–4999 are terminal, so the
// client SDK does not reconnect after them (4000–4499 would make it reconnect).
const SESSION_ENDED = { code: 4501, reason: "session ended" };

/** Publishes and disconnects through the Centrifugo server HTTP API. */
export class CentrifugoPublisher implements RealtimePublisher, RealtimeConnections {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
  ) {}

  publish(channel: string, data: unknown): Promise<void> {
    return this.call("publish", { channel, data });
  }

  // The Centrifugo user of a connection is its session (see realtimeToken.ts).
  disconnectSession(sessionId: string): Promise<void> {
    return this.call("disconnect", { user: sessionId, disconnect: SESSION_ENDED });
  }

  private async call(method: string, params: unknown): Promise<void> {
    const response = await fetch(`${this.apiUrl}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey },
      body: JSON.stringify(params),
      signal: AbortSignal.timeout(API_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Centrifugo ${method} failed: HTTP ${response.status}`);
    }

    // Centrifugo answers 200 even for API errors and reports them in the body.
    const body = (await response.json()) as { error?: { code: number; message: string } };

    if (body.error) {
      throw new Error(`Centrifugo ${method} failed: ${body.error.code} ${body.error.message}`);
    }
  }
}
