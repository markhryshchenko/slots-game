// How a symbol looks. The client knows symbol ids only from the server's
// rules and spin results; art replaces these plates later.
export interface SymbolStyle {
  label: string;
  fill: number;
  text: number;
}

const STYLES: Record<string, SymbolStyle> = {
  CHERRY: { label: "CHERRY", fill: 0xd7263d, text: 0xffffff },
  LEMON: { label: "LEMON", fill: 0xf4d35e, text: 0x3a2e00 },
  PLUM: { label: "PLUM", fill: 0x7b2cbf, text: 0xffffff },
  WATERMELON: { label: "MELON", fill: 0x2a9d4b, text: 0xffffff },
  SEVEN: { label: "7", fill: 0xf5c542, text: 0xb3001b },
};

const UNKNOWN: SymbolStyle = { label: "?", fill: 0x555066, text: 0xffffff };

export function symbolStyle(symbol: string): SymbolStyle {
  return STYLES[symbol] ?? { ...UNKNOWN, label: symbol };
}
