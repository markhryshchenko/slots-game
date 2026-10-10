import type { Request, Response } from "express";
import { getCurrency } from "../../platform/currencies/currencies.js";
import { getSessionLimits } from "../../platform/operators/registry.js";

// GET /v1/limits — the bet ladder and the win cap for the session's operator
// and currency, in minor units; the client builds its bet selector from it.
export function limitsController(_req: Request, res: Response): void {
  const { operatorId, currency } = res.locals.session;
  const limits = getSessionLimits(operatorId, currency);
  const { symbol, exponent } = getCurrency(currency);

  res.json({
    currency,
    currencySign: symbol,
    currencyExponent: exponent,
    betLevels: limits.betLevels,
    defaultBet: limits.defaultBet,
    minBet: limits.betLevels[0],
    maxBet: limits.betLevels.at(-1),
    maxWin: limits.maxWin,
  });
}
