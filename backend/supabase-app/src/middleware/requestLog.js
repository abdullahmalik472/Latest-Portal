import { randomUUID } from "node:crypto";
import { pinoHttp } from "pino-http";
import { log } from "../utils/log.js";

// Accept an incoming id (e.g. from a load balancer) only if it looks like an id; anything else could inject junk into logs.
const SAFE_ID = /^[A-Za-z0-9._-]{8,64}$/;

/**
 * One log line per request (method, url, status, duration, user) and a per-request child logger on req.log.
 * The id is echoed back as X-Request-Id so a user can quote it in a bug report and you can find every line.
 */
export const requestLog = pinoHttp({
  logger: log,
  genReqId(req, res) {
    const incoming = req.headers["x-request-id"];
    const id = typeof incoming === "string" && SAFE_ID.test(incoming) ? incoming : randomUUID();
    res.setHeader("X-Request-Id", id);
    return id;
  },
  // Only what we need: never headers (cookies) or bodies (passwords).
  serializers: {
    req: (req) => ({ id: req.id, method: req.method, url: req.url }),
    res: (res) => ({ statusCode: res.statusCode }),
  },
  // Called at the start and again when the response finishes, so by then req.auth is known.
  customProps: (req) => ({ ip: req.ip, ...(req.auth?.user && { userId: req.auth.user.id }) }),
  customLogLevel: (_req, res, err) => (err || res.statusCode >= 500 ? "error" : res.statusCode >= 400 ? "warn" : "info"),
  customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl ?? req.url} ${res.statusCode}`,
  // Health checks run every few seconds; logging them only adds noise.
  autoLogging: { ignore: (req) => req.url === "/health" },
});
