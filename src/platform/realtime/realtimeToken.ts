import { SignJWT } from "jose";

/**
 * Connection token for Centrifugo. Signed with its own secret, not the API
 * session secret: a leaked Centrifugo secret must not allow forging sessions.
 */
export function signRealtimeToken(
  playerId: string,
  expiresAt: Date,
  secret: string,
): Promise<string> {
  return new SignJWT({})
    .setProtectedHeader({ alg: "HS256", typ: "JWT" })
    .setSubject(playerId)
    .setIssuedAt()
    .setExpirationTime(Math.floor(expiresAt.getTime() / 1000))
    .sign(new TextEncoder().encode(secret));
}
