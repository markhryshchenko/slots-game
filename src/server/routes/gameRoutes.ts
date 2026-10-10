import { Router } from "express";
import { resolveGame } from "../middleware/resolveGame.js";
import { spinController } from "../controllers/spinController.js";
import { balanceController } from "../controllers/balanceController.js";

// mergeParams: without it :gameId from the parent path is not visible here.
export const gameRoutes = Router({ mergeParams: true });

gameRoutes.use(resolveGame);
gameRoutes.post("/spin", spinController);
gameRoutes.get("/balance", balanceController);
