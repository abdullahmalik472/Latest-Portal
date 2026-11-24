import { Router } from "express";
import { authenticate } from "../middleware/auth.js";
import { accountLoginLimiter, loginLimiter, registerLimiter } from "../middleware/security.js";
import { validate } from "../middleware/validate.js";
import * as auth from "../services/auth.ts";
import { clearSessionCookie, readSessionCookie, setSessionCookie } from "../utils/cookies.js";
import { loginSchema, registerSchema } from "../validation/schemas.ts";

const router = Router();

const meta = (req) => ({ ip: req.ip ?? null, userAgent: (req.get("user-agent") ?? "").slice(0, 255) || null });

// The token only ever travels in the Set-Cookie header, never in the JSON body.
const respondWithSession = (res, status, { token, user, session }) => {
  setSessionCookie(res, token, new Date(session.expiresAt));
  res.status(status).json({ user, session });
};

router.post("/register", registerLimiter, validate(registerSchema), async (req, res) => {
  respondWithSession(res, 201, await auth.register(req.valid.body, meta(req)));
});

router.post("/login", loginLimiter, validate(loginSchema), accountLoginLimiter, async (req, res) => {
  // A fresh token on every login (no session fixation). Drop any previous session for this browser.
  await auth.logout(readSessionCookie(req));
  respondWithSession(res, 200, await auth.login(req.valid.body, meta(req)));
});

router.post("/logout", async (req, res) => {
  await auth.logout(readSessionCookie(req));
  clearSessionCookie(res);
  res.status(204).end();
});

router.get("/me", authenticate, (req, res) => {
  res.json(auth.me(req.auth));
});

export default router;
