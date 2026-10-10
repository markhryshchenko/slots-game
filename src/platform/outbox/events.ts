/** Outbox event types. The relay decides how each type is delivered. */
export const BALANCE_CHANGED = "balance.changed";

export interface BalanceChangedEvent {
  playerId: string;
  /** Absolute balance after the change, cents — so a duplicate delivery is harmless. */
  balance: number;
  currency: string;
  roundId: string;
  reason: "debit" | "credit";
}
