import type { GameConfig } from "../GameConfig.js";
import { rtp96LowVolatility } from "./math/rtp96LowVolatility.js";
import { SYMBOLS } from "./symbols.js";

export const sevenSlice: GameConfig = {
  gameId: "sevenslice",
  symbols: Object.values(SYMBOLS),
  mathProfile: rtp96LowVolatility,
};
