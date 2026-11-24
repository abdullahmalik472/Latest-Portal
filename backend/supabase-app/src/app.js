import cookieParser from "cookie-parser";
import express from "express";
import helmet from "helmet";
import { DB_NAME, env } from "./config/env.js";
import { sb } from "./db/supabase.ts";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { requestLog } from "./middleware/requestLog.js";
import { apiLimiter, noStore, originGuard, requireJson } from "./middleware/security.js";
import authRoutes from "./routes/auth.js";
import internalRoutes from "./routes/internal.js";
import portalRoutes from "./routes/portal.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");
  app.set("trust proxy", env.TRUST_PROXY);

  app.use(helmet());
  app.use(requestLog);
  // No CORS headers on purpose: the browser reaches this API only through the same-origin Next.js proxy.

  app.get("/health", async (_req, res) => {
    const { error } = await sb.from("orgs").select("id", { count: "exact", head: true });
    res.status(error ? 503 : 200).json({ ok: !error, db: DB_NAME });
  });

  // Service-to-service (MySQL -> Supabase migration). Own body parser with a larger limit.
  app.use("/internal", noStore, internalRoutes);

  const api = express.Router();
  api.use(apiLimiter, noStore, originGuard, requireJson, express.json({ limit: "10kb" }), cookieParser());
  api.use("/auth", authRoutes);
  api.use("/", portalRoutes);
  app.use("/api", api);

  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
