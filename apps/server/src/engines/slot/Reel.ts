import type { RNG } from "../../core/RNG.js";
import type { SymbolId } from "../../models/Symbol.js";

export class Reel {
  constructor(
    private readonly symbols: readonly SymbolId[],
    private readonly rng: RNG,
  ) {
    if (symbols.length === 0) {
      throw new Error("Reel must contain at least one symbol");
    }
  }

  spin(): number {
    return this.rng.nextInt(this.symbols.length);
  }

  getSymbol(position: number): SymbolId {
    const normalizedPosition = this.normalizePosition(position);

    return this.symbols[normalizedPosition]!;
  }

  getSymbolAtOffset(stop: number, offset: number): SymbolId {
    return this.getSymbol(stop + offset);
  }

  get size(): number {
    return this.symbols.length;
  }

  private normalizePosition(position: number): number {
    return (
      ((position % this.symbols.length) + this.symbols.length) %
      this.symbols.length
    );
  }
}