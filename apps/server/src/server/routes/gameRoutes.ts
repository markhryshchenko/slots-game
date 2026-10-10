import { Router } from "express";
import { resolveGame } from "../middleware/resolveGame.js";
import { requireSession, requireSessionForGame } from "../middleware/requireSession.js";
import { gameRulesController } from "../controllers/gameRulesController.js";
import { spinController } from "../controllers/spinController.js";

// mergeParams: without it :gameId from the parent path is not visible here.
export const gameRoutes = Router({ mergeParams: true });

gameRoutes.use(resolveGame);
// Public: the rules screen is shown before and without a session.
gameRoutes.get("/", gameRulesController);
gameRoutes.post("/spin", requireSession, requireSessionForGame, spinController);
