// Background worker: runs the cron jobs in their own process (npm run worker).
// The user migration is driven by mysql-app's worker (it pushes to /internal/migrations/users).
import cron from "node-cron";
import { DB_NAME, env } from "./config/env.js";
import { runSessionCleanup } from "./jobs/cleanupSessions.js";
import { runRegistrationReport } from "./jobs/registrationReport.js";
import { log } from "./utils/log.js";

const tasks = [];

function schedule(name, expression, job) {
  if (!cron.validate(expression)) throw new Error(`Invalid cron expression for ${name}: "${expression}"`);
  const task = cron.schedule(
    expression,
    async () => {
      try {
        await job();
      } catch (err) {
        log.error(`job ${name} failed`, err);
      }
    },
    { name, timezone: env.CRON_TIMEZONE, noOverlap: true },
  );
  tasks.push(task);
  log.info("job scheduled", { name, expression, timezone: env.CRON_TIMEZONE });
}

schedule("registration-report", env.REPORT_CRON, runRegistrationReport);
schedule("session-cleanup", env.SESSION_CLEANUP_CRON, runSessionCleanup);

log.info(`${DB_NAME} worker started`);

function shutdown(signal) {
  log.info("worker shutting down", { signal });
  for (const t of tasks) t.stop();
  process.exit(0);
}
process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);
