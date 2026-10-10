import type { Request, Response } from "express";
import { InsufficientFundsError } from "../../platform/wallet/errors.js";
import { InvalidBetError } from "../services/GameService.js";

export async function spinController(req: Request, res: Response): Promise<void> {
  const bet: unknown = req.body?.bet;

  if (typeof bet !== "number" || !Number.isInteger(bet) || bet <= 0) {
    res
      .status(400)
      .json({ error: "bet must be a positive integer amount in minor units" });
    return;
  }

  try {
    res.json(await res.locals.gameService.spin(res.locals.session, bet));
  } catch (error) {
    if (error instanceof InvalidBetError || error instanceof InsufficientFundsError) {
      res.status(400).json({ error: error.message });
      return;
    }

    throw error; // unexpected: Express 5 turns it into a 500
  }
}
