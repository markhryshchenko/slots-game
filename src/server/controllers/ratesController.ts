import type { Request, Response } from "express";
import { ratesSnapshot } from "../../platform/currencies/rates.js";

// GET /v1/rates — public and informational: money is never converted with it.
export function ratesController(_req: Request, res: Response): void {
  res.json(ratesSnapshot);
}
