import type { MathConfig } from "../MathConfig.js";
import { SYMBOLS } from "../../models/Symbol.js";

export const rtp96HighVolatility: MathConfig = {
  id: "rtp-96-high-volatility",
  targetRtp: 0.96,

  reels: [
    {
      id: 1,
      strip: [
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.CHERRY,
        SYMBOLS.BELL,
        SYMBOLS.LEMON,
        SYMBOLS.STAR,
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.BELL,
        SYMBOLS.SEVEN,
      ],
    },

    {
      id: 2,
      strip: [
        SYMBOLS.LEMON,
        SYMBOLS.CHERRY,
        SYMBOLS.BELL,
        SYMBOLS.LEMON,
        SYMBOLS.STAR,
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.BELL,
        SYMBOLS.CHERRY,
        SYMBOLS.SEVEN,
      ],
    },

    {
      id: 3,
      strip: [
        SYMBOLS.CHERRY,
        SYMBOLS.BELL,
        SYMBOLS.LEMON,
        SYMBOLS.STAR,
        SYMBOLS.CHERRY,
        SYMBOLS.LEMON,
        SYMBOLS.BELL,
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
    { symbol: SYMBOLS.CHERRY, payouts: { 3: 1 } },
    { symbol: SYMBOLS.LEMON, payouts: { 3: 1 } },
    { symbol: SYMBOLS.BELL, payouts: { 3: 2 } },
    { symbol: SYMBOLS.STAR, payouts: { 3: 5 } },
    { symbol: SYMBOLS.SEVEN, payouts: { 3: 885 } },
  ],
};
