import type { Request, Response } from "express";

// GET /v1/games/:gameId — public rules: field size, paylines, paytable.
export function gameRulesController(_req: Request, res: Response): void {
  res.json(res.locals.gameService.rules());
}
