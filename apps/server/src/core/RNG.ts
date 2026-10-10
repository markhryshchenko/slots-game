export interface RNG {
    next(): number;
    nextInt(max: number): number;
  }