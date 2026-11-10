// Service-to-service endpoints. Not reachable through the Next.js proxy (which only forwards /api/*),
// bound to loopback by default, and protected by a shared bearer token.
import express, { Router } from "express";
import { z } from "zod";
import { env } from "../config/env.js";
import { validate } from "../middleware/validate.js";
import { importUsers } from "../services/userImport.js";
import { safeEqual } from "../utils/crypto.js";
import { HttpError, notFound } from "../utils/errors.js";

const router = Router();

function requireServiceToken(req, _res, next) {
  if (!env.MIGRATION_TOKEN) throw notFound("Route not found"); // feature disabled
  const header = req.get("authorization") ?? "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (!token || !safeEqual(token, env.MIGRATION_TOKEN)) throw new HttpError(401, "UNAUTHENTICATED", "Invalid service token");
  next();
}

const importSchema = z.object({
  users: z
    .array(
      z.object({
        id: z.uuid(),
        name: z.string().trim().min(1).max(120),
        email: z.string().trim().toLowerCase().max(254).pipe(z.email()),
        passwordHash: z.string().regex(/^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/, "not a bcrypt hash"),
        role: z.enum(["admin", "teacher", "student"]),
        reg: z.string().regex(/^REG-\d{4}-[A-Z0-9]{4,10}$/),
        orgName: z.string().trim().min(2).max(120),
        createdAt: z.iso.datetime(),
      }),
    )
    .min(1)
    .max(200),
});

router.post(
  "/migrations/users",
  requireServiceToken,
  express.json({ limit: "1mb" }),
  validate(importSchema),
  async (req, res) => {
    res.json(await importUsers(req.valid.body.users));
  },
);

export default router;
