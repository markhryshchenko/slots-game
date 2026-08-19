export const SYMBOLS = {
    CHERRY: "CHERRY",
    LEMON: "LEMON",
    BELL: "BELL",
    STAR: "STAR",
    SEVEN: "SEVEN",
  } as const;
  
  export type SymbolId = typeof SYMBOLS[keyof typeof SYMBOLS];