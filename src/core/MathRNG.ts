import type { RNG } from "./RNG.js";

export class MathRNG implements RNG {
  next(): number {
    return Math.random();
  }

  nextInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0) {
      throw new Error("max must be a positive integer");
    }

    return Math.floor(this.next() * max);
  }
}