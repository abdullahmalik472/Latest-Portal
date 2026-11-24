import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { DB_NAME, env } from "./config/env.js";
import { pool } from "./db/pool.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requestLog } from "./middleware/requestLog.js";
import { apiLimiter, noStore, originGuard, requireJson } from "./middleware/security.js";
import authRoutes from "./routes/auth.js";
import userMigrationRoutes from "./routes/userMigration.js";
import portalRoutes from "./routes/portal.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet());
  app.use(requestLog);
  // No CORS headers on purpose: the browser reaches this API only through the same-origin Next.js proxy.

  app.get("/health", async (_req, res) => {
    try {
      await pool.query("SELECT 1");
      res.json({ ok: true, db: DB_NAME });
    } catch {
      res.status(503).json({ ok: false, db: DB_NAME });
    }
  });

  const api = express.Router();
  api.use(apiLimiter, noStore, originGuard, requireJson, express.json({ limit: "10kb" }), cookieParser());
  api.use("/auth", authRoutes);
  api.use("/migration", userMigrationRoutes);
  api.use("/", portalRoutes);
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
