import type { Request, Response } from "express";
import { findOperator, resolvePlayer } from "../../platform/operators/registry.js";
import { sessions, wallet } from "../platform.js";
import { getGameService } from "../services/gameServices.js";

// Game launch, Turbo-style: the client brings the operator's launch token,
// the operator id (cid) and the game; it gets the player profile and a
// session token for all further requests.
export async function profileController(req: Request, res: Response): Promise<void> {
  const { token, cid, gameId }: Record<string, unknown> = req.body ?? {};

  if (typeof cid !== "string" || typeof gameId !== "string") {
    res.status(400).json({ error: "cid and gameId are required" });
    return;
  }

  if (typeof token !== "string" || token.length === 0) {
    res.status(401).json({ error: "Missing launch token" });
    return;
  }

  const operator = findOperator(cid);

  if (!operator) {
    res.status(404).json({ error: `Unknown operator: ${cid}` });
    return;
  }

  const gameService = getGameService(gameId);

  if (!gameService) {
    res.status(404).json({ error: `Unknown game: ${gameId}` });
    return;
  }

  if (operator.currency !== gameService.currency) {
    res.status(400).json({ error: `Game ${gameId} is not available in ${operator.currency}` });
    return;
  }

  const player = resolvePlayer(operator, token);

  const balance = await wallet.openAccount(
    player.playerId,
    operator.currency,
    operator.startingBalanceCents,
  );

  const { token: sessionToken } = await sessions.create({
    playerId: player.playerId,
    operatorId: operator.operatorId,
    gameId,
    currency: operator.currency,
    displayName: player.displayName,
  });

  res.json({
    playerId: player.playerId,
    displayName: player.displayName,
    operatorId: operator.operatorId,
    gameId,
    balance: balance.balanceCents,
    currency: balance.currency,
    sessionToken,
  });
}
