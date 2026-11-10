import rateLimit from "express-rate-limit";
import { env } from "../config/env.js";
import { HttpError, forbidden } from "../utils/errors.js";

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/**
 * CSRF defence in depth (on top of SameSite=Strict cookies):
 * browsers always send Origin / Sec-Fetch-Site on cross-site requests, so reject any
 * state-changing request that comes from an origin we do not serve.
 */
export function originGuard(req, _res, next) {
  if (SAFE_METHODS.has(req.method)) return next();
  const origin = req.get("origin");
  if (origin && !env.ALLOWED_ORIGINS.includes(origin)) throw forbidden("BAD_ORIGIN", "Request origin not allowed");
  if (req.get("sec-fetch-site") === "cross-site") throw forbidden("BAD_ORIGIN", "Cross-site request blocked");
  next();
}

/** Only JSON bodies are accepted. HTML forms cannot send JSON cross-site without a CORS preflight. */
export function requireJson(req, _res, next) {
  const hasBody = Number(req.get("content-length") || 0) > 0 || req.get("transfer-encoding");
  if (hasBody && !req.is("application/json")) throw new HttpError(415, "UNSUPPORTED_MEDIA_TYPE", "Send JSON");
  next();
}

export function noStore(_req, res, next) {
  res.set("Cache-Control", "no-store");
  next();
}

const limited = (message) => ({ error: { code: "RATE_LIMITED", message } });

export const apiLimiter = rateLimit({
  windowMs: 60_000,
  limit: 300,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: limited("Too many requests. Slow down a little."),
});

/** Failed logins only: 10 per 15 min per IP. */
export const loginLimiter = rateLimit({
  windowMs: 15 * 60_000,
  limit: 10,
  skipSuccessfulRequests: true,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: limited("Too many failed sign-in attempts. Try again in 15 minutes."),
});

/** Registrations (and the password-reuse check they perform): 10 per hour per IP. */
export const registerLimiter = rateLimit({
  windowMs: 60 * 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: limited("Too many sign-up attempts. Try again later."),
});
