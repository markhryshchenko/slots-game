/** An operator's limits in one currency; every amount is in that currency's minor units. */
export interface CurrencyLimits {
  /** Demo balance a new player starts with. */
  startingBalance: number;
  /** Allowed total bets, strictly ascending; each divisible by every game's paylines count. */
  betLevels: readonly number[];
  /** The bet the client preselects; one of `betLevels`. */
  defaultBet: number;
  /** Cap on the total win of one round. */
  maxWin: number;
}

export interface OperatorConfig {
  /** Operator id; the client sends it as `cid` (same as Turbo Games). */
  operatorId: string;
  /** Used when the launch request names no currency; must be a key of `currencies`. */
  defaultCurrency: string;
  /** Supported currencies (lowercase ISO 4217) and the limits in each. */
  currencies: Readonly<Record<string, CurrencyLimits>>;
  /**
   * Demo operator: accepts any launch token and hands out free balance, so it
   * exists only when explicitly enabled (DEMO_OPERATOR_ENABLED=true).
   */
  demo: boolean;
}
