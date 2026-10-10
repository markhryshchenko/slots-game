import { Router } from "express";
import { requireSession } from "../middleware/requireSession.js";
import { profileController } from "../controllers/profileController.js";
import { balanceController } from "../controllers/balanceController.js";
import { limitsController } from "../controllers/limitsController.js";
import { logoutController } from "../controllers/logoutController.js";
import { ratesController } from "../controllers/ratesController.js";
import { realtimeTokenController } from "../controllers/realtimeTokenController.js";
import { getRoundController, listRoundsController } from "../controllers/roundsController.js";

export const playerRoutes = Router();

playerRoutes.post("/profile", profileController);
playerRoutes.post("/logout", requireSession, logoutController);
playerRoutes.post("/realtime/token", requireSession, realtimeTokenController);
playerRoutes.get("/rates", ratesController);
playerRoutes.get("/limits", requireSession, limitsController);
playerRoutes.get("/balance", requireSession, balanceController);
playerRoutes.get("/rounds", requireSession, listRoundsController);
playerRoutes.get("/rounds/:roundId", requireSession, getRoundController);
