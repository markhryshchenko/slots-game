// The client's own view of the API, written from the server's documentation.
// There is deliberately no shared package with the server: the client knows
// the HTTP contract, never the server code. Amounts are integer minor units.

export interface Profile {
  playerId: string;
  displayName: string;
  operatorId: string;
  gameId: string;
  balance: number;
  currency: string;
  currencySign: string;
  currencyExponent: number;
  sessionToken: string;
  realtime: {
    url: string;
    token: string;
    expiresAt: string;
    refreshUrl: string;
    channel: string;
  };
}

export interface Payline {
  id: number;
  /** Row index on each reel, left to right. */
  rows: number[];
}

export interface GameRules {
  gameId: string;
  mathProfileId: string;
  reels: number;
  rows: number;
  symbols: string[];
  paylines: Payline[];
  /** Multipliers of the line bet (total bet / paylines) by symbol count. */
  paytable: Array<{ symbol: string; payouts: Record<string, number> }>;
}

export interface Limits {
  currency: string;
  currencySign: string;
  currencyExponent: number;
  betLevels: number[];
  defaultBet: number;
  minBet: number;
  maxBet: number;
  maxWin: number;
}

export interface Win {
  paylineId: number;
  symbol: string;
  count: number;
  multiplier: number;
  amount: number;
}

export interface SpinResult {
  roundId: string;
  currency: string;
  bet: number;
  totalWin: number;
  maxWinReached: boolean;
  balance: number;
  stops: number[];
  /** grid[row][reel]. */
  grid: string[][];
  wins: Win[];
}

export interface BalanceUpdate {
  balance: number;
  currency: string;
  roundId: string;
  reason: "debit" | "credit";
}
