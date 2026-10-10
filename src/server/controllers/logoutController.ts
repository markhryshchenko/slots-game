import type { Request, Response } from "express";
import { realtime, sessions } from "../platform.js";

// POST /v1/logout — ends the session at once: its token answers 401 afterwards,
// and the live Centrifugo connections of this session (only) are closed.
export async function logoutController(_req: Request, res: Response): Promise<void> {
  const { sessionId } = res.locals.session;

  // The session is what grants access, so it goes first and must succeed.
  await sessions.revoke(sessionId);

  // Best effort: if Centrifugo is unreachable, the connection still dies when
  // its short-lived token expires, because renewal needs the revoked session.
  try {
    await realtime.disconnectSession(sessionId);
  } catch (error) {
    console.error(
      "Realtime disconnect on logout failed:",
      error instanceof Error ? error.message : error,
    );
  }

  res.status(204).end();
}
