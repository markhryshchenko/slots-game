/** Port for pushing messages to connected clients (Centrifugo today). */
export interface RealtimePublisher {
  publish(channel: string, data: unknown): Promise<void>;
}

/**
 * User-limited channel ("#"): only a connection whose token `sub` equals
 * playerId may subscribe. playerId must be unique across the whole platform
 * (operator adapters include the operator id in it).
 */
export function balanceChannel(playerId: string): string {
  return `balance#${playerId}`;
}
