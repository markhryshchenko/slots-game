import type { SymbolId } from "../../models/Symbol.js";
import type { Payline } from "../../models/Payline.js";
import type { Paytable } from "../../models/Paytable.js";

// S lets a game pin its own symbol set (MathConfig<SevenSliceSymbol>),
// so a typo in a strip or paytable fails to compile. The engine itself
// uses the default: any string.
export interface ReelConfig<S extends SymbolId = SymbolId> {
    id: number;
    strip: readonly S[];
}

export interface MathConfig<S extends SymbolId = SymbolId> {
    id: string;
    targetRtp: number;
    reels: readonly ReelConfig<S>[];
    paylines: readonly Payline[];
    paytable: Paytable<S>;
}
