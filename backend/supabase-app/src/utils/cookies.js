import { env } from "../config/env.js";

// HttpOnly: invisible to JavaScript (XSS cannot steal it).
// SameSite=Strict: never sent on cross-site requests (CSRF).
// Path: only sent to this backend's proxy path, never to the other backend or to pages.
const base = () => ({
  httpOnly: true,
  secure: env.COOKIE_SECURE,
  sameSite: "strict",
  path: env.COOKIE_PATH,
});

export const readSessionCookie = (req) => {
  const v = req.cookies?.[env.COOKIE_NAME];
  return typeof v === "string" && v.length > 0 && v.length <= 128 ? v : null;
};

export const setSessionCookie = (res, token, expiresAt) => res.cookie(env.COOKIE_NAME, token, { ...base(), expires: expiresAt });

export const clearSessionCookie = (res) => res.clearCookie(env.COOKIE_NAME, base());
