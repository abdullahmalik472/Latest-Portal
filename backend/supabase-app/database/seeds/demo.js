// Demo data (npm run db:seed). Schema comes only from migrations: run `npm run db:migrate` first.
// Same fixed ids as the MySQL seed, so migrated demo users are recognised as already present.
// Safe to re-run: existing rows are kept.
import bcrypt from "bcryptjs";
import { env } from "../../src/config/env.js";
import { must, sb } from "../../src/db/supabase.ts";
import { SEED_COURSES, SEED_ORGS, SEED_USERS, minutesAgo } from "./demo-data.js";

if (env.isProd && !process.argv.includes("--force")) {
  console.error("Refusing to seed demo accounts with NODE_ENV=production (pass --force if you really mean it).");
  process.exit(1);
}

const upsert = (table, rows) => sb.from(table).upsert(rows, { onConflict: "id", ignoreDuplicates: true });

try {
  must(await upsert("orgs", SEED_ORGS.map((o) => ({ id: o.id, name: o.name, created_at: minutesAgo(30 * 1440).toISOString() }))));

  const users = [];
  for (const u of SEED_USERS) {
    users.push({
      id: u.id,
      org_id: u.orgId,
      name: u.name,
      email: u.email,
      password_hash: await bcrypt.hash(u.password, env.BCRYPT_ROUNDS),
      role: u.role,
      reg: u.reg,
      created_at: minutesAgo(u.minutesAgo).toISOString(),
    });
  }
  must(await upsert("users", users));

  must(
    await upsert(
      "courses",
      SEED_COURSES.map((c) => ({ id: c.id, org_id: c.orgId, teacher_id: c.teacherId, title: c.title, created_at: minutesAgo(c.minutesAgo).toISOString() })),
    ),
  );
  console.log(`Seeded ${SEED_ORGS.length} orgs, ${SEED_USERS.length} users, ${SEED_COURSES.length} courses (existing rows kept).`);
} catch (err) {
  console.error("Seeding failed:", err.message);
  if (/does not exist|Could not find the table/i.test(err.message)) console.error("Run `npm run db:migrate` first.");
  process.exitCode = 1;
}
