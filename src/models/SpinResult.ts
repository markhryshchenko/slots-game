import type { Grid } from "./Grid.js";
import type { Win } from "./Win.js";

export interface SpinResult {
  stops: readonly number[];
  grid: Grid;
  wins: readonly Win[];
  totalWin: number;
}