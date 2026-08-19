import type { MathConfig } from "../MathConfig.js";
import { SYMBOLS } from "../../models/Symbol.js";

export const classic96: MathConfig = {
  id: "classic-96",
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
};