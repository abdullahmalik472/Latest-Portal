// Demo data (npm run db:seed). Schema comes only from migrations: run `npm run db:migrate` first.
// Safe to re-run: existing rows are kept (INSERT IGNORE on fixed ids).
import bcrypt from "bcryptjs";
import { env } from "../../src/config/env.js";
import { pool } from "../../src/db/pool.js";
import { SEED_COURSES, SEED_ORGS, SEED_USERS, minutesAgo } from "./demo-data.js";

if (env.isProd && !process.argv.includes("--force")) {
  console.error("Refusing to seed demo accounts with NODE_ENV=production (pass --force if you really mean it).");
  process.exit(1);
}

try {
  const [[{ n }]] = await pool.query(
    "SELECT COUNT(*) AS n FROM information_schema.tables WHERE table_schema = DATABASE() AND table_name IN ('orgs', 'users', 'courses')",
  );
  if (Number(n) < 3) throw new Error("Tables are missing. Run `npm run db:migrate` first.");

  for (const o of SEED_ORGS) {
    await pool.execute("INSERT IGNORE INTO orgs (id, name, created_at) VALUES (?, ?, ?)", [o.id, o.name, minutesAgo(30 * 1440)]);
  }
  for (const u of SEED_USERS) {
    await pool.execute(
      "INSERT IGNORE INTO users (id, org_id, name, email, password_hash, role, reg, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [u.id, u.orgId, u.name, u.email, await bcrypt.hash(u.password, env.BCRYPT_ROUNDS), u.role, u.reg, minutesAgo(u.minutesAgo)],
    );
  }
  for (const c of SEED_COURSES) {
    await pool.execute("INSERT IGNORE INTO courses (id, org_id, teacher_id, title, created_at) VALUES (?, ?, ?, ?, ?)", [
      c.id, c.orgId, c.teacherId, c.title, minutesAgo(c.minutesAgo),
    ]);
  }
  console.log(`Seeded ${SEED_ORGS.length} orgs, ${SEED_USERS.length} users, ${SEED_COURSES.length} courses (existing rows kept).`);
} catch (err) {
  console.error("Seeding failed:", err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
