import type { MathConfig } from "../engines/slot/MathConfig.js";
import type { SymbolId } from "../models/Symbol.js";

// A game knows no currency: bets, limits and the win cap belong to the
// operator and its currencies (platform/operators).
export interface GameConfig {
  gameId: string;
  /** The game's own symbol set; the engine treats symbols as opaque strings. */
  symbols: readonly SymbolId[];
  mathProfile: MathConfig;
}
