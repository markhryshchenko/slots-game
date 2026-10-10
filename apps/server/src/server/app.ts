import express from "express";
import { routes } from "./routes/index.js";
import { errorHandler, notFoundHandler } from "./middleware/errorHandler.js";

export function createApp() {
  const app = express();

  app.use(express.json());
  app.use(routes);

  // Last: unknown routes and any error get a JSON body, never a stack trace.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
