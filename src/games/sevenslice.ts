import type { GameConfig } from "./GameConfig.js";
import { rtp96LowVolatility } from "../game/math/rtp96LowVolatility.js";

export const sevenSlice: GameConfig = {
  gameId: "sevenslice",
  currency: "usd",
  mathProfile: rtp96LowVolatility,
  betLevels: [
    5, 10, 15, 20, 25, 30, 35, 40, 45, 50, // step 5¢ up to $0.50
    75, 100, 125, 150, 175, 200, 225, 250, // step 25¢ up to $2.50
    300, 400, 500, 600, 700, 750, 800, 900, 1000, // $3 – $10
    1250, 1500, 1750, // $12.50 – $17.50
  ],
};
