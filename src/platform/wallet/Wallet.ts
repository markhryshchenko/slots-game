export interface Balance {
  /** Integer minor units (cents). */
  balanceCents: number;
  /** ISO 4217, lowercase. */
  currency: string;
}

/**
 * Port for player money. Games only debit and credit through it and never
 * know whether the money lives with us (InternalWallet) or with the operator
 * (SeamlessWallet, later). Async from the start: real implementations call a
 * database or the operator's API.
 */
export interface Wallet {
  /** Opens an account with a starting balance; returns the existing one if already open. */
  openAccount(playerId: string, currency: string, initialCents: number): Promise<Balance>;
  getBalance(playerId: string): Promise<Balance>;
  /** Idempotent per roundId: a retried debit for the same round is not charged twice. */
  debit(playerId: string, amountCents: number, roundId: string): Promise<Balance>;
  /** Idempotent per roundId: a retried credit for the same round is not paid twice. */
  credit(playerId: string, amountCents: number, roundId: string): Promise<Balance>;
}
