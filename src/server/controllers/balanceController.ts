import type { Request, Response } from "express";
import { fromCents } from "../../core/money.js";
import { wallet } from "../platform.js";

// The balance belongs to the player, not to a game, so this route has no gameId.
export async function balanceController(_req: Request, res: Response): Promise<void> {
  const balance = await wallet.getBalance(res.locals.session.playerId);

  res.json({
    balance: balance.balanceCents,
    // Human-readable copy for debugging only; clients compute with `balance` (cents).
    balanceFloat: fromCents(balance.balanceCents),
    currency: balance.currency,
  });
}
