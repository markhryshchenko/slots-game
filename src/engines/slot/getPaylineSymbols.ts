import type { Grid } from "../../models/Grid.js";
import type { Payline } from "../../models/Payline.js";
import type { SymbolId } from "../../models/Symbol.js";

export function getPaylineSymbols(
  grid: Grid,
  payline: Payline,
): SymbolId[] {
  return payline.rows.map((row, reelIndex) => {
    const symbol = grid[row]?.[reelIndex];

    if (symbol === undefined) {
      throw new Error(
        `Payline ${payline.id} points outside the grid: row ${row}, reel ${reelIndex}`,
      );
    }

    return symbol;
  });
}
