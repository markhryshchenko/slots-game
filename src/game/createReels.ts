import { Reel } from "./Reel.js";
import type { RNG } from "./RNG.js";
import type { MathConfig } from "./MathConfig.js";

export function createReels(
  config: MathConfig,
  rng: RNG,
): Reel[] {
  return config.reels.map(
    (reelConfig) => new Reel(reelConfig.strip, rng),
  );
}