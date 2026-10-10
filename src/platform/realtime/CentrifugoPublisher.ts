import type { RealtimePublisher } from "./RealtimePublisher.js";

const PUBLISH_TIMEOUT_MS = 2000;

/** Publishes through the Centrifugo server HTTP API. */
export class CentrifugoPublisher implements RealtimePublisher {
  constructor(
    private readonly apiUrl: string,
    private readonly apiKey: string,
  ) {}

  async publish(channel: string, data: unknown): Promise<void> {
    const response = await fetch(`${this.apiUrl}/publish`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-API-Key": this.apiKey },
      body: JSON.stringify({ channel, data }),
      signal: AbortSignal.timeout(PUBLISH_TIMEOUT_MS),
    });

    if (!response.ok) {
      throw new Error(`Centrifugo publish failed: HTTP ${response.status}`);
    }

    // Centrifugo answers 200 even for API errors and reports them in the body.
    const body = (await response.json()) as { error?: { code: number; message: string } };

    if (body.error) {
      throw new Error(`Centrifugo publish failed: ${body.error.code} ${body.error.message}`);
    }
  }
}
