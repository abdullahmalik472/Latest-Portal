import { env } from "../config/env.js";
import { HttpError } from "../utils/errors.js";
import { log } from "../utils/log.js";

export function notFoundHandler(_req, res) {
  res.status(404).json({ error: { code: "NOT_FOUND", message: "Route not found" } });
}

// eslint-disable-next-line no-unused-vars
export function errorHandler(err, req, res, _next) {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ error: { code: err.code, message: err.message, ...(err.details && { details: err.details }) } });
  }
  if (err?.type === "entity.too.large") return res.status(413).json({ error: { code: "PAYLOAD_TOO_LARGE", message: "Request body too large" } });
  if (err?.type === "entity.parse.failed") return res.status(400).json({ error: { code: "BAD_JSON", message: "Malformed JSON" } });

  // Unknown error: log details server-side, reveal nothing to the client.
  log.error("unhandled error", err, { method: req.method, path: req.path });
  res.status(500).json({ error: { code: "INTERNAL", message: env.isProd ? "Something went wrong" : `Internal error: ${err.message}` } });
}
