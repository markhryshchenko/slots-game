import type { Grid } from "../models/Grid.js";
import type { Payline } from "../models/Payline.js";
import type { Paytable } from "../models/Paytable.js";
import type { Win } from "../models/Win.js";
import type { Bet } from "../models/Bet.js";

import { getPaylineSymbols } from "./getPaylineSymbols.js";

//выигрыш рассчитывается от ставки на линию, поэтому в методе evaluate передается ставка на линию.
export class WinEvaluator {
    constructor(
      private readonly paylines: readonly Payline[],
      private readonly paytable: Paytable,
    ) {}
  
    evaluate(
      grid: Grid,
      bet: Bet,
    ): Win[] {
      const wins: Win[] = [];
  
      for (const payline of this.paylines) {
        const symbols = getPaylineSymbols(grid, payline);
        const firstSymbol = symbols[0];
  
        if (!symbols.every((symbol) => symbol === firstSymbol)) {
          continue;
        }
  
        const multiplier = this.getMultiplier(
          firstSymbol,
          symbols.length,
        );
  
        if (multiplier === null) {
          continue;
        }
  
        wins.push({
          paylineId: payline.id,
          symbol: firstSymbol,
          count: symbols.length,
          multiplier,
          amount: bet.line * multiplier,
        });
      }
  
      return wins;
    }
  
    private getMultiplier(
      symbol: Win["symbol"],
      count: number,
    ): number | null {
      const entry = this.paytable.find(
        (item) => item.symbol === symbol,
      );
  
      if (!entry) {
        return null;
      }
  
      return entry.payouts[count] ?? null;
    }
  }