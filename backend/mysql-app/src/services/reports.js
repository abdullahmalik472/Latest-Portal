import * as reports from "../repositories/reports.js";
import * as users from "../repositories/users.js";
import { WINDOWS } from "../utils/windows.js";

/** Live registration report + the latest snapshots written by the cron job. */
export async function registrationReport() {
  const [counts, recent, snapshots] = await Promise.all([
    reports.windowCounts(new Date()),
    users.list({ limit: 5 }),
    reports.listSnapshots(24),
  ]);
  return {
    totalUsers: counts.total_users,
    windows: WINDOWS.map((w) => ({ key: w.key, label: w.label, minutes: w.minutes, count: counts[w.key] })),
    recent,
    snapshots,
  };
}
