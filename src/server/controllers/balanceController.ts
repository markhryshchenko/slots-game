import type { Request, Response } from "express";
import { gameService } from "../services/GameService.js";

export function balanceController(_req: Request, res: Response): void {
  res.json(gameService.getBalance());
}
