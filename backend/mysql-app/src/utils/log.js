import pino from "pino";
import { DB_NAME, env } from "../config/env.js";

/**
 * The app-wide pino logger. Call shape: log.info({ ...fields }, "message").
 * Pass errors as { err } so pino serializes type, message and stack.
 *
 * Inside a request handler prefer req.log (set by middleware/requestLog.js): it is a child of this
 * logger that stamps every line with the request id.
 */
export const log = pino({
  level: env.LOG_LEVEL,
  base: { app: `${DB_NAME}-app` },
  // Safety net: if any of these ever end up in a log line, the value is replaced before it is written.
  redact: {
    paths: [
      "req.headers.cookie",
      "req.headers.authorization",
      'res.headers["set-cookie"]',
      "*.password",
      "*.passwordHash",
      "*.adminCode",
      "*.token",
    ],
    censor: "[Redacted]",
  },
  timestamp: pino.stdTimeFunctions.isoTime,
  // Production: raw JSON lines on stdout for the log collector. Dev: pretty, coloured output.
  ...(env.LOG_PRETTY && { transport: { target: "pino-pretty", options: { translateTime: "SYS:HH:MM:ss", ignore: "pid,hostname" } } }),
});
