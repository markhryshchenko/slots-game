import type { SymbolId } from "../models/Symbol.js";
import { SYMBOLS } from "../models/Symbol.js";

export interface ReelConfig {
  id: number;
  strip: readonly SymbolId[];
}

export interface MathConfig {
  id: string;
  targetRtp: number;
  reels: readonly ReelConfig[];
}