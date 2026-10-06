import type { GameConfig } from "./GameConfig.js";

// Fails fast at server start, so a typo in a config never reaches a player's bet.
export function validateGameConfig(game: GameConfig): void {
  const paylinesCount = game.mathProfile.paylines.length;

  if (game.betLevels.length === 0) {
    throw new Error(`${game.gameId}: betLevels must not be empty`);
  }

  game.betLevels.forEach((level, index) => {
    if (!Number.isInteger(level) || level <= 0) {
      throw new Error(
        `${game.gameId}: bet level ${level} must be a positive integer amount of cents`,
      );
    }

    if (level % paylinesCount !== 0) {
      throw new Error(
        `${game.gameId}: bet level ${level} must be divisible by ${paylinesCount} paylines`,
      );
    }

    const previous = game.betLevels[index - 1];

    if (previous !== undefined && level <= previous) {
      throw new Error(
        `${game.gameId}: betLevels must be strictly ascending (${previous} → ${level})`,
      );
    }
  });
}
