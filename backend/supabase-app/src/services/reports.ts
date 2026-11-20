import * as reports from "../repositories/reports.js";
import * as users from "../repositories/users.ts";
import { WINDOWS } from "../utils/windows.js";
import type { ReportQuery } from "../validation/schemas.ts";

/** Live registration report + the latest snapshots written by the cron job. */
export async function registrationReport({ snapshots }: ReportQuery) {
  const [counts, recent, history] = await Promise.all([
    reports.windowCounts(new Date()),
    users.list({ limit: 5 }),
    reports.listSnapshots(snapshots),
  ]);
  return {
    totalUsers: counts.total_users,
    windows: WINDOWS.map((w) => ({ key: w.key, label: w.label, minutes: w.minutes, count: counts[w.key] })),
    recent,
    snapshots: history,
  };
}
