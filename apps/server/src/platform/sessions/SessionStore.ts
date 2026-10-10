import type { Session } from "./Session.js";

/**
 * Port: where server-side sessions live. A store must drop a session by
 * itself once its TTL has passed, so ended sessions never pile up.
 */
export interface SessionStore {
  save(session: Session, ttlSeconds: number): Promise<void>;
  find(sessionId: string): Promise<Session | undefined>;
  delete(sessionId: string): Promise<void>;
}
