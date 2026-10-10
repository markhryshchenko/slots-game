import type { Balance } from "../wallet/Wallet.js";

/** Everything needed to settle one played round and to replay it later. */
export interface RoundSettlement {
  roundId: string;
  playerId: string;
  operatorId: string;
  sessionId: string;
  gameId: string;
  /** The math profile the outcome was computed with: stops + this id replay the round. */
  mathProfileId: string;
  currency: string;
  betCents: number;
  totalWinCents: number;
  /** totalWinCents was capped at the operator max win. */
  maxWinReached: boolean;
  stops: readonly number[];
  grid: readonly (readonly string[])[];
  wins: readonly unknown[];
}

export interface RoundRecord {
  roundId: string;
  gameId: string;
  mathProfileId: string;
  currency: string;
  betCents: number;
  totalWinCents: number;
  balanceAfterCents: number;
  maxWinReached: boolean;
  stops: unknown;
  grid: unknown;
  wins: unknown;
  createdAt: Date;
}

/**
 * Port: settles a round atomically — bet debit, win credit, the round record
 * and their notifications commit together or not at all. Idempotent per roundId.
 */
export interface RoundSettler {
  settle(round: RoundSettlement): Promise<Balance>;
}

/** Port: a player's own rounds, for history, disputes and audits. */
export interface RoundHistory {
  findRound(playerId: string, roundId: string): Promise<RoundRecord | undefined>;
  listRounds(playerId: string, limit: number): Promise<RoundRecord[]>;
}
