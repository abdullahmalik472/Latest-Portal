import { DB_NAME } from "../config/env.js";
import * as reports from "../repositories/reports.js";
import { log } from "../utils/log.js";

/** Computes registration counts per time window and stores a snapshot (shown on the Reports page). */
export async function runRegistrationReport() {
  const generatedAt = new Date();
  const counts = await reports.windowCounts(generatedAt);
  await reports.insertSnapshot({ generatedAt, counts });
  log.info({ db: DB_NAME, ...counts }, "registration report");
  return counts;
}
