import type { Paytable } from "../../models/Paytable.js";
import { SYMBOLS } from "../../models/Symbol.js";

export const paytable: Paytable = [
  {
    symbol: SYMBOLS.CHERRY,
    payouts: {
      3: 5,
    },
  },
  {
    symbol: SYMBOLS.LEMON,
    payouts: {
      3: 10,
    },
  },
  {
    symbol: SYMBOLS.BELL,
    payouts: {
      3: 20,
    },
  },
  {
    symbol: SYMBOLS.STAR,
    payouts: {
      3: 50,
    },
  },
  {
    symbol: SYMBOLS.SEVEN,
    payouts: {
      3: 100,
    },
  },
];