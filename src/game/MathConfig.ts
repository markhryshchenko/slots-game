import type { SymbolId } from "../models/Symbol.js";
import type { Payline } from "../models/Payline.js";
import type { Paytable } from "../models/Paytable.js";

export interface ReelConfig {
    id: number;
    strip: readonly SymbolId[];
}

export interface MathConfig {
    id: string;
    targetRtp: number;
    reels: readonly ReelConfig[];
    paylines: readonly Payline[];
    paytable: Paytable;
}