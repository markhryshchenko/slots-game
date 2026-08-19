import type { Grid } from "../models/Grid.js";
import type { SymbolId } from "../models/Symbol.js";
import type { Reel } from "./Reel.js";

export function createGrid(
    reels: readonly Reel[],
    stops: readonly number[],
  ): Grid {
    if (reels.length !== stops.length) {
      throw new Error("Reels and stops must have the same length");
    }
  
    const grid: Grid = [];
  
    for (let row = 0; row < 3; row++) {
      const currentRow = reels.map((reel, reelIndex) => {
        const stop = stops[reelIndex];
  
        return reel.getSymbolAtOffset(stop, row - 1);
      });
  
      grid.push(currentRow);
    }
  
    return grid;
  }