import { randomUUID } from "node:crypto";
import { SignJWT, jwtVerify } from "jose";
import type { NewSession, Session } from "./Session.js";
import type { SessionStore } from "./SessionStore.js";

/**
 * Issues and checks session tokens. The token is a signed JWT (HS256) that
 * points to a session kept on the server, so a session can also be ended
 * server-side (logout), not only by waiting for the token to expire.
 */
export class SessionService {
  private readonly key: Uint8Array;

  constructor(
    private readonly store: SessionStore,
    secret: string,
    private readonly ttlSeconds: number,
  ) {
    this.key = new TextEncoder().encode(secret);
  }

  async create(input: NewSession): Promise<{ session: Session; token: string }> {
    const session: Session = {
      ...input,
      sessionId: randomUUID(),
      subject: `${input.operatorId}@${input.playerId}`,
      expiresAt: new Date(Date.now() + this.ttlSeconds * 1000),
    };

    // The stored session and the token expire together.
    await this.store.save(session, this.ttlSeconds);

    const token = await new SignJWT({ sid: session.sessionId })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setSubject(session.subject)
      .setIssuedAt()
      .setExpirationTime(Math.floor(session.expiresAt.getTime() / 1000))
      .sign(this.key);

    return { session, token };
  }

  /** Returns the session for a valid, unexpired, not revoked token, otherwise undefined. */
  async authenticate(token: string): Promise<Session | undefined> {
    let sessionId: unknown;
    let subject: unknown;

    try {
      const { payload } = await jwtVerify(token, this.key, { algorithms: ["HS256"] });
      sessionId = payload.sid;
      subject = payload.sub;
    } catch {
      return undefined; // bad signature, malformed or expired token
    }

    if (typeof sessionId !== "string") {
      return undefined;
    }

    const session = await this.store.find(sessionId);

    if (!session || session.subject !== subject) {
      return undefined;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      await this.store.delete(sessionId);
      return undefined;
    }

    return session;
  }

  /** Ends a session before its expiry: its token stops working at once. */
  async revoke(sessionId: string): Promise<void> {
    await this.store.delete(sessionId);
  }
}
