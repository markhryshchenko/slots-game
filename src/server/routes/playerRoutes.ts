import { Router } from "express";
import { requireSession } from "../middleware/requireSession.js";
import { profileController } from "../controllers/profileController.js";
import { balanceController } from "../controllers/balanceController.js";
import { getRoundController, listRoundsController } from "../controllers/roundsController.js";

export const playerRoutes = Router();

playerRoutes.post("/profile", profileController);
playerRoutes.get("/balance", requireSession, balanceController);
playerRoutes.get("/rounds", requireSession, listRoundsController);
playerRoutes.get("/rounds/:roundId", requireSession, getRoundController);
