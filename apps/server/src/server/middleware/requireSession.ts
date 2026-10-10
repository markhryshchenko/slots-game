import type { NextFunction, Request, Response } from "express";
import type { Session } from "../../platform/sessions/Session.js";
import { sessions } from "../platform.js";

declare global {
  namespace Express {
    interface Locals {
      session: Session;
    }
  }
}

export async function requireSession(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const header = req.headers.authorization;
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    res.status(401).json({ error: "Missing session token" });
    return;
  }

  const session = await sessions.authenticate(token);

  if (!session) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }

  res.locals.session = session;
  next();
}

// A session is opened for one game (like a game launch); it cannot spin another.
export function requireSessionForGame(
  _req: Request,
  res: Response,
  next: NextFunction,
): void {
  if (res.locals.session.gameId !== res.locals.gameService.gameId) {
    res.status(403).json({ error: "Session was opened for another game" });
    return;
  }

  next();
}
