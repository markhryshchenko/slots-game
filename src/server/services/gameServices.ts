import { games } from "../../games/registry.js";
import { wallet } from "../platform.js";
import { GameService } from "./GameService.js";

const services = new Map<string, GameService>();

for (const game of games) {
  if (services.has(game.gameId)) {
    throw new Error(`Duplicate gameId in registry: ${game.gameId}`);
  }

  services.set(game.gameId, new GameService(game, wallet));
}

export function getGameService(gameId: string): GameService | undefined {
  return services.get(gameId);
}
