import type { Session } from "./Session.js";
import type { SessionStore } from "./SessionStore.js";

/** Sessions in process memory, for tests and scripts (like InternalWallet). */
export class InMemorySessionStore implements SessionStore {
  private readonly sessions = new Map<string, { session: Session; expiresAtMs: number }>();

  async save(session: Session, ttlSeconds: number): Promise<void> {
    this.sessions.set(session.sessionId, { session, expiresAtMs: Date.now() + ttlSeconds * 1000 });
  }

  async find(sessionId: string): Promise<Session | undefined> {
    const entry = this.sessions.get(sessionId);

    if (entry && entry.expiresAtMs <= Date.now()) {
      this.sessions.delete(sessionId);
      return undefined;
    }

    return entry?.session;
  }

  async delete(sessionId: string): Promise<void> {
    this.sessions.delete(sessionId);
  }
}
