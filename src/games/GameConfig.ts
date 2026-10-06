import type { MathConfig } from "../engines/slot/MathConfig.js";
import type { SymbolId } from "../models/Symbol.js";

export interface GameConfig {
  gameId: string;
  /** ISO 4217 code, lowercase (Stripe style): "usd", "eur". */
  currency: string;
  /** The game's own symbol set; the engine treats symbols as opaque strings. */
  symbols: readonly SymbolId[];
  mathProfile: MathConfig;
  /** Allowed total bets, ascending, in integer minor units (cents). */
  betLevels: readonly number[];
}
