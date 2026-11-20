import { Router } from "express";
import { env } from "../config/env.js";
import { authenticate, requireRole } from "../middleware/auth.js";
import * as migrationRuns from "../repositories/userMigrationRuns.js";
import * as users from "../repositories/users.ts";

// Admin-only, read-only view of the MySQL -> Supabase migration progress.
const router = Router();

router.get("/status", authenticate, requireRole("admin"), async (_req, res) => {
  const [counts, lastRun] = await Promise.all([users.migrationCounts(), migrationRuns.lastMigrationRun()]);
  res.json({ enabled: env.MIGRATION_ENABLED, schedule: env.MIGRATION_CRON, counts, lastRun });
});

export default router;
