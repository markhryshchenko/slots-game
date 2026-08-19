import type { Grid } from "../models/Grid.js";
import type { Payline } from "../models/Payline.js";
import type { SymbolId } from "../models/Symbol.js";

export function getPaylineSymbols(
  grid: Grid,
  payline: Payline,
): SymbolId[] {
  return payline.rows.map((row, reelIndex) => {
    return grid[row][reelIndex];
  });
}