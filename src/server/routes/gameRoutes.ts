import { Router } from "express";
import { spinController } from "../controllers/spinController.js";
import { balanceController } from "../controllers/balanceController.js";

export const gameRoutes = Router();

gameRoutes.post("/spin", spinController);
gameRoutes.get("/balance", balanceController);
