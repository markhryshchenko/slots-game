import type { Session } from "../../platform/sessions/Session.js";
import { balanceChannel } from "../../platform/realtime/RealtimePublisher.js";
import { realtimeTokenExpiry, signRealtimeToken } from "../../platform/realtime/realtimeToken.js";
import { config } from "../config.js";

export async function issueRealtimeToken(
  session: Session,
): Promise<{ token: string; expiresAt: Date }> {
  const expiresAt = realtimeTokenExpiry(session.expiresAt, config.centrifugo.tokenTtlSeconds);
  const token = await signRealtimeToken(
    { sessionId: session.sessionId, channels: [balanceChannel(session.playerId)], expiresAt },
    config.centrifugo.tokenSecret,
  );
  return { token, expiresAt };
}
