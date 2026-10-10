import { games } from "../../games/registry.js";
import { operators } from "../../platform/operators/registry.js";
import { validateOperatorConfig } from "../../platform/operators/validateOperatorConfig.js";
import { rounds } from "../platform.js";
import { GameService } from "./GameService.js";

const services = new Map<string, GameService>();

for (const game of games) {
  if (services.has(game.gameId)) {
    throw new Error(`Duplicate gameId in registry: ${game.gameId}`);
  }

  services.set(game.gameId, new GameService(game, rounds));
}

// Every operator's bet levels must work in every game, so they are checked
// against the paylines of all registered games at startup.
const paylineCounts = [...services.values()].map((service) => service.paylinesCount);

for (const operator of operators) {
  validateOperatorConfig(operator, paylineCounts);
}

export function getGameService(gameId: string): GameService | undefined {
  return services.get(gameId);
}
