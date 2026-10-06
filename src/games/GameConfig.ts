import type { MathConfig } from "../game/MathConfig.js";

export interface GameConfig {
  gameId: string;
  /** ISO 4217 code, lowercase (Stripe style): "usd", "eur". */
  currency: string;
  mathProfile: MathConfig;
  /** Allowed total bets, ascending, in integer minor units (cents). */
  betLevels: readonly number[];
}
