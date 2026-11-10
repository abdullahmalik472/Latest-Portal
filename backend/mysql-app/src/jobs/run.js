// Run a job once from the command line, e.g. `npm run job:migrate-users`.
import { pool } from "../db/pool.js";
import { runSessionCleanup } from "./cleanupSessions.js";
import { runUserMigration } from "./migrateUsers.js";
import { runRegistrationReport } from "./registrationReport.js";

const JOBS = {
  "registration-report": runRegistrationReport,
  "migrate-users": runUserMigration,
  "cleanup-sessions": runSessionCleanup,
};

const name = process.argv[2];
const job = JOBS[name];
if (!job) {
  console.error(`Usage: node src/jobs/run.js <${Object.keys(JOBS).join(" | ")}>`);
  process.exit(1);
}

try {
  console.log(JSON.stringify(await job(), null, 2));
} catch (err) {
  console.error(`Job "${name}" failed:`, err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
