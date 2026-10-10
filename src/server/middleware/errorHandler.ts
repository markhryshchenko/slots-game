import type { ErrorRequestHandler, RequestHandler } from "express";

// Express's default handlers answer with HTML and, outside production, a full
// stack trace with file paths. These always answer `{ error }` instead.

interface HttpError {
  status?: number;
  type?: string;
  expose?: boolean;
  message?: string;
}

export const notFoundHandler: RequestHandler = (_req, res) => {
  res.status(404).json({ error: "Not found" });
};

export const errorHandler: ErrorRequestHandler = (error: HttpError, _req, res, next) => {
  if (res.headersSent) {
    next(error);
    return;
  }

  const status =
    typeof error.status === "number" && error.status >= 400 && error.status < 600 ? error.status : 500;

  if (status >= 500) {
    // Full details go to the server log only, never to the client.
    console.error(error);
    res.status(status).json({ error: "Internal server error" });
    return;
  }

  res.status(status).json({ error: clientMessage(error) });
};

function clientMessage(error: HttpError): string {
  switch (error.type) {
    case "entity.parse.failed":
      return "Malformed JSON body";
    case "entity.too.large":
      return "Request body too large";
    default:
      // http-errors marks messages that are safe to show with `expose`.
      return error.expose && error.message ? error.message : "Bad request";
  }
}
