// Minimal structured logger. Never pass request bodies here (they can contain passwords).
const line = (level, msg, meta) =>
  JSON.stringify({ t: new Date().toISOString(), level, msg, ...(meta && { ...meta }) });

export const log = {
  info: (msg, meta) => console.log(line("info", msg, meta)),
  warn: (msg, meta) => console.warn(line("warn", msg, meta)),
  error: (msg, err, meta) =>
    console.error(line("error", msg, { ...meta, error: err?.message, stack: err?.stack?.split("\n").slice(0, 5).join(" | ") })),
};
