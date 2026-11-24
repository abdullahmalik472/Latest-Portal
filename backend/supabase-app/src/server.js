import { createApp } from "./app.js";
import { DB_NAME, env } from "./config/env.js";
import { log } from "./utils/log.js";

const server = createApp().listen(env.PORT, env.HOST, () => {
  log.info({ url: `http://${env.HOST}:${env.PORT}`, env: env.NODE_ENV, migrationImport: Boolean(env.MIGRATION_TOKEN) }, `${DB_NAME}-app listening`);
});

function shutdown(signal) {
  log.info({ signal }, "shutting down");
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(1), 10_000).unref();
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
