import type { Request, Response } from "express";

export function spinController(req: Request, res: Response): void {
  const bet: unknown = req.body?.bet;

  if (typeof bet !== "number" || !Number.isInteger(bet) || bet <= 0) {
    res
      .status(400)
      .json({ error: "bet must be a positive integer amount in cents" });
    return;
  }

  try {
    res.json(res.locals.gameService.spin(bet));
  } catch (error) {
    res.status(400).json({ error: (error as Error).message });
  }
}
