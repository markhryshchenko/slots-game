export const SYMBOLS = {
    CHERRY: "CHERRY",
    LEMON: "LEMON",
    PLUM: "PLUM",
    WATERMELON: "WATERMELON",
    SEVEN: "SEVEN",
  } as const;
  
  export type SymbolId = typeof SYMBOLS[keyof typeof SYMBOLS];