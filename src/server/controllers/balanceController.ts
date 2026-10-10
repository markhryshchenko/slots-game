import type { Request, Response } from "express";

export function balanceController(_req: Request, res: Response): void {
  res.json(res.locals.gameService.getBalance());
}
