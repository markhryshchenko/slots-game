import { Router } from "express";
import { resolveGame } from "../middleware/resolveGame.js";
import { requireSession, requireSessionForGame } from "../middleware/requireSession.js";
import { spinController } from "../controllers/spinController.js";

// mergeParams: without it :gameId from the parent path is not visible here.
export const gameRoutes = Router({ mergeParams: true });

gameRoutes.use(resolveGame, requireSession, requireSessionForGame);
gameRoutes.post("/spin", spinController);
