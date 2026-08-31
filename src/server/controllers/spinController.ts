import type { Request, Response } from "express";
import { gameService } from "../services/GameService.js";

export function spinController(req: Request, res: Response): void {
  const bet = Number(req.body?.bet);

  if (!Number.isFinite(bet) || bet <= 0) {
    res.status(400).json({ error: "bet must be a positive number" });
    return;
  }

  try {
    res.json(gameService.spin(bet));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
