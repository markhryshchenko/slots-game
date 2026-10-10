import type { GameConfig } from "./GameConfig.js";
import { sevenSlice } from "./sevenslice/config.js";

// The only place a new game is registered.
export const games: readonly GameConfig[] = [sevenSlice];
