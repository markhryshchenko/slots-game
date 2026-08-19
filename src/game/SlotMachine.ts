import type { MathConfig } from "./MathConfig.js";
import type { SpinResult } from "../models/SpinResult.js";
import type { RNG } from "./RNG.js";

import { createGrid } from "./createGrid.js";
import { createReels } from "./createReels.js";
import { createBet } from "./createBet.js";
import { WinEvaluator } from "./WinEvaluator.js";

export class SlotMachine {
    private readonly reels;
    private readonly winEvaluator;
  
    constructor(
      private readonly config: MathConfig,
      private readonly rng: RNG,
    ) {
      this.reels = createReels(config, rng);
  
      this.winEvaluator = new WinEvaluator(
        config.paylines,
        config.paytable,
      );
    }
  
    spin(totalBet: number): SpinResult {
      const bet = createBet(
        totalBet,
        this.config.paylines.length,
      );
  
      const stops = this.reels.map((reel) => reel.spin());
  
      const grid = createGrid(
        this.reels,
        stops,
      );
  
      const wins = this.winEvaluator.evaluate(
        grid,
        bet,
      );
  
      const totalWin = wins.reduce(
        (sum, win) => sum + win.amount,
        0,
      );
  
      return {
        stops,
        grid,
        wins,
        totalWin,
      };
    }
  }