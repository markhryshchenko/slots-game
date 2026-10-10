import type { NextFunction, Request, Response } from "express";
import type { GameService } from "../services/GameService.js";
import { getGameService } from "../services/gameServices.js";

declare global {
  namespace Express {
    interface Locals {
      gameService: GameService;
    }
  }
}

export function resolveGame(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  // In Express 5 a route param is string | string[] (wildcards give arrays).
  const { gameId } = req.params;
  const gameService =
    typeof gameId === "string" ? getGameService(gameId) : undefined;

  if (!gameService) {
    res.status(404).json({ error: `Unknown game: ${gameId}` });
    return;
  }

  res.locals.gameService = gameService;
  next();
}
