import type { Request, Response } from "express";
import { getCurrency, toDisplayAmount } from "../../platform/currencies/currencies.js";
import { findLimits, findOperator, resolvePlayer } from "../../platform/operators/registry.js";
import { balanceChannel } from "../../platform/realtime/RealtimePublisher.js";
import { issueRealtimeToken } from "../services/realtimeTokens.js";
import { config } from "../config.js";
import { sessions, wallet } from "../platform.js";
import { getGameService } from "../services/gameServices.js";

// Game launch, Turbo-style: the client brings the operator's launch token,
// the operator id (cid) and the game; it gets the player profile and a
// session token for all further requests. `currency` is optional and
// defaults to the operator's default currency.
export async function profileController(req: Request, res: Response): Promise<void> {
  const { token, cid, gameId, currency }: Record<string, unknown> = req.body ?? {};

  if (typeof cid !== "string" || typeof gameId !== "string") {
    res.status(400).json({ error: "cid and gameId are required" });
    return;
  }

  if (currency !== undefined && typeof currency !== "string") {
    res.status(400).json({ error: "currency must be a string" });
    return;
  }

  if (typeof token !== "string" || token.length === 0) {
    res.status(401).json({ error: "Missing launch token" });
    return;
  }

  const operator = findOperator(cid, { allowDemo: config.demoOperatorEnabled });

  if (!operator) {
    res.status(404).json({ error: `Unknown operator: ${cid}` });
    return;
  }

  const gameService = getGameService(gameId);

  if (!gameService) {
    res.status(404).json({ error: `Unknown game: ${gameId}` });
    return;
  }

  const currencyCode = currency ?? operator.defaultCurrency;
  const limits = findLimits(operator, currencyCode);

  if (!limits) {
    res.status(400).json({ error: `Currency ${currencyCode} is not supported by ${operator.operatorId}` });
    return;
  }

  const player = resolvePlayer(operator, token);

  const balance = await wallet.openAccount(player.playerId, currencyCode, limits.startingBalance);

  // An account keeps the currency it was opened in; its money is never converted.
  if (balance.currency !== currencyCode) {
    res.status(400).json({ error: `Player account is in ${balance.currency}, not ${currencyCode}` });
    return;
  }

  const accountCurrency = getCurrency(balance.currency);

  const { session, token: sessionToken } = await sessions.create({
    playerId: player.playerId,
    operatorId: operator.operatorId,
    gameId,
    currency: balance.currency,
    displayName: player.displayName,
  });

  const realtimeToken = await issueRealtimeToken(session);

  res.json({
    playerId: player.playerId,
    displayName: player.displayName,
    operatorId: operator.operatorId,
    gameId,
    balance: balance.balanceCents,
    // Human-readable copy for debugging only; clients compute with `balance` (minor units).
    balanceFloat: toDisplayAmount(balance.balanceCents, balance.currency),
    currency: balance.currency,
    currencySign: accountCurrency.symbol,
    currencyExponent: accountCurrency.exponent,
    sessionToken,
    // Turbo-style: the client connects to Centrifugo and is subscribed to its
    // own balance channel server-side (the token's `channels` claim); balance
    // changes then arrive over WebSocket. The
    // connection token is short-lived: the client renews it at `refreshUrl`.
    realtime: {
      url: config.centrifugo.wsUrl,
      token: realtimeToken.token,
      expiresAt: realtimeToken.expiresAt.toISOString(),
      refreshUrl: "/v1/realtime/token",
      channel: balanceChannel(player.playerId),
    },
  });
}
