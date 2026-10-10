import { Router } from "express";
import { healthRoutes } from "./healthRoutes.js";
import { playerRoutes } from "./playerRoutes.js";
import { gameRoutes } from "./gameRoutes.js";

export const routes = Router();

routes.use(healthRoutes);
routes.use("/v1/games/:gameId", gameRoutes);
routes.use("/v1", playerRoutes);
