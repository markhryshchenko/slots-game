import type { MathConfig } from "../../../engines/slot/MathConfig.js";
import { SYMBOLS, type SevenSliceSymbol } from "../symbols.js";

export const rtp96LowVolatility: MathConfig<SevenSliceSymbol> = {
  id: "rtp-96-low-volatility",
  targetRtp: 0.96,

  reels: [
    {
      id: 1,
      strip: [
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.CHERRY,
        SYMBOLS.PLUM,
        SYMBOLS.LEMON,
        SYMBOLS.WATERMELON,
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.PLUM,
        SYMBOLS.SEVEN,
      ],
    },

    {
      id: 2,
      strip: [
        SYMBOLS.LEMON,
        SYMBOLS.CHERRY,
        SYMBOLS.PLUM,
        SYMBOLS.LEMON,
        SYMBOLS.WATERMELON,
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.PLUM,
        SYMBOLS.CHERRY,
        SYMBOLS.SEVEN,
      ],
    },

    {
      id: 3,
      strip: [
        SYMBOLS.CHERRY,
        SYMBOLS.PLUM,
        SYMBOLS.LEMON,
        SYMBOLS.WATERMELON,
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.PLUM,
        SYMBOLS.LEMON,
        SYMBOLS.CHERRY,
        SYMBOLS.SEVEN,
      ],
    },
  ],

  paylines: [
    { id: 1, rows: [0, 0, 0] },
    { id: 2, rows: [1, 1, 1] },
    { id: 3, rows: [2, 2, 2] },
    { id: 4, rows: [0, 1, 2] },
    { id: 5, rows: [2, 1, 0] },
  ],

  paytable: [
    { symbol: SYMBOLS.CHERRY, payouts: { 3: 14 } },
    { symbol: SYMBOLS.LEMON, payouts: { 3: 14 } },
    { symbol: SYMBOLS.PLUM, payouts: { 3: 20 } },
    { symbol: SYMBOLS.WATERMELON, payouts: { 3: 22 } },
    { symbol: SYMBOLS.SEVEN, payouts: { 3: 22 } },
  ],
};
