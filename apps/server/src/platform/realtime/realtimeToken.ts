import { SignJWT } from "jose";

export interface RealtimeTokenClaims {
  /**
   * The Centrifugo user is the session, not the player: logout disconnects
   * exactly this session, other launches of the same player keep their feed.
   */
  sessionId: string;
  /** Server-side subscriptions; the client cannot subscribe to these itself. */
  channels: readonly string[];
  expiresAt: Date;
}

/**
 * Connection token for Centrifugo. Signed with its own secret, not the API
 * session secret: a leaked Centrifugo secret must not allow forging sessions.
 */
export function signRealtimeToken(claims: RealtimeTokenClaims, secret: string): Promise<string> {
  return new SignJWT({ channels: [...claims.channels] })
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(claims.sessionId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(claims.expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(secret));
}

/**
 * A connection token lives only a few minutes and never outlives its session.
 * Centrifugo cannot revoke a token, so after logout a copied token works at
 * most this long: renewal goes through the API, which checks the session.
 */
export function realtimeTokenExpiry(
  sessionExpiresAt: Date,
  ttlSeconds: number,
  now = Date.now(),
): Date {
  return new Date(Math.min(sessionExpiresAt.getTime(), now + ttlSeconds * 1000));
}
