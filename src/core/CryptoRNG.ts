import { randomInt } from "node:crypto";
import type { RNG } from "./RNG.js";

// node:crypto.randomInt accepts ranges up to 2^48.
const MAX_RANGE = 2 ** 48;

/**
 * Cryptographically secure RNG for real spins. Math.random is a
 * xorshift128+ generator whose state can be recovered from its outputs, and
 * spins return their stop positions to the client — so outcomes would become
 * predictable. Not yet a certified RNG; that is a separate compliance step.
 */
export class CryptoRNG implements RNG {
  next(): number {
    return randomInt(MAX_RANGE) / MAX_RANGE;
  }

  /** Uniform integer in [0, max) without modulo bias (randomInt rejects out-of-range draws). */
  nextInt(max: number): number {
    if (!Number.isInteger(max) || max <= 0 || max > MAX_RANGE) {
      throw new Error(`max must be a positive integer up to ${MAX_RANGE}`);
    }

    return randomInt(max);
  }
}
