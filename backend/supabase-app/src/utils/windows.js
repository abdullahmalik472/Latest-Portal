// Registration report time windows (shared by the live report and the cron snapshots).
export const WINDOWS = [
  { key: "last_10m", label: "10 minutes", minutes: 10 },
  { key: "last_1h", label: "1 hour", minutes: 60 },
  { key: "last_1d", label: "1 day", minutes: 1440 },
  { key: "last_7d", label: "7 days", minutes: 10080 },
  { key: "last_30d", label: "30 days", minutes: 43200 },
];

export const windowStart = (now, minutes) => new Date(now.getTime() - minutes * 60_000);
