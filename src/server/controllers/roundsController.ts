import type { Request, Response } from "express";
import { toDisplayAmount } from "../../platform/currencies/currencies.js";
import type { RoundRecord } from "../../platform/rounds/RoundSettler.js";
import { rounds } from "../platform.js";

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100;

// GET /v1/rounds?limit=20 — the player's latest rounds, newest first.
export async function listRoundsController(req: Request, res: Response): Promise<void> {
  const raw = req.query.limit;
  const limit = raw === undefined ? DEFAULT_LIMIT : Number(raw);

  if (!Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) {
    res.status(400).json({ error: `limit must be an integer from 1 to ${MAX_LIMIT}` });
    return;
  }

  const records = await rounds.listRounds(res.locals.session.playerId, limit);
  res.json({ rounds: records.map(toResponse) });
}

// GET /v1/rounds/:roundId — one of the player's own rounds (for disputes and audits).
export async function getRoundController(req: Request, res: Response): Promise<void> {
  const { roundId } = req.params;
  const record =
    typeof roundId === "string"
      ? await rounds.findRound(res.locals.session.playerId, roundId)
      : undefined;

  // Another player's round answers exactly like a missing one.
  if (!record) {
    res.status(404).json({ error: "Round not found" });
    return;
  }

  res.json(toResponse(record));
}

function toResponse(record: RoundRecord) {
  return {
    roundId: record.roundId,
    gameId: record.gameId,
    mathProfileId: record.mathProfileId,
    currency: record.currency,
    bet: record.betCents,
    totalWin: record.totalWinCents,
    maxWinReached: record.maxWinReached,
    balanceAfter: record.balanceAfterCents,
    // Human-readable copy for debugging only; clients compute with minor units.
    balanceAfterFloat: toDisplayAmount(record.balanceAfterCents, record.currency),
    stops: record.stops,
    grid: record.grid,
    wins: record.wins,
    createdAt: record.createdAt.toISOString(),
  };
}
