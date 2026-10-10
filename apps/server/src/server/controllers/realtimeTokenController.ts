import type { Request, Response } from "express";
import { issueRealtimeToken } from "../services/realtimeTokens.js";

// POST /v1/realtime/token — renews the short-lived Centrifugo connection token
// (the client SDK calls it from `getToken`). Only a live session gets one, so
// after logout a connection cannot be kept alive.
export async function realtimeTokenController(_req: Request, res: Response): Promise<void> {
  const { token, expiresAt } = await issueRealtimeToken(res.locals.session);
  res.json({ token, expiresAt: expiresAt.toISOString() });
}
