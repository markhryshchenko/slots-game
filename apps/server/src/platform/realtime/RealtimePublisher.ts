/** Port for pushing messages to connected clients (Centrifugo today). */
export interface RealtimePublisher {
  publish(channel: string, data: unknown): Promise<void>;
}

/** Port for ending live connections (Centrifugo today). */
export interface RealtimeConnections {
  /** Closes the connections of one session only; clients must not reconnect on their own. */
  disconnectSession(sessionId: string): Promise<void>;
}

/**
 * Server-side channel: clients cannot subscribe to the "balance" namespace
 * themselves; a connection gets it only through the `channels` claim of its
 * token, which the API signs for the session's own player. playerId must be
 * unique across the whole platform (operator adapters include the operator id).
 */
export function balanceChannel(playerId: string): string {
  return `balance:${playerId}`;
}
