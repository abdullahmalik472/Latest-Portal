// Receiver side of the one-way MySQL -> Supabase user migration.
import * as orgs from "../repositories/orgs.js";
import * as users from "../repositories/users.js";
import { isUniqueViolation } from "../db/supabase.js";
import { newRegNumber } from "../utils/crypto.js";
import { log } from "../utils/log.js";

/**
 * Imports users exported by mysql-app.
 *  - Organizations are matched by name (case-insensitive) and created when missing.
 *  - User ids are preserved; ids that already exist are skipped (idempotent, safe to retry).
 *  - bcrypt hashes are copied as-is, so users keep their password.
 * Returns { imported, alreadyPresent, failed } so the sender can mark exactly what succeeded.
 */
export async function importUsers(incoming) {
  const orgIds = await orgs.ensureByNames(incoming.map((u) => u.orgName));
  const now = new Date().toISOString();
  const toRow = (u, reg = u.reg) => ({
    id: u.id,
    org_id: orgIds.get(orgs.orgKey(u.orgName)),
    name: u.name,
    email: u.email,
    password_hash: u.passwordHash,
    role: u.role,
    reg,
    created_at: u.createdAt,
    migrated_from: "mysql",
    imported_at: now,
  });

  try {
    const inserted = new Set(await users.insertIgnoringExisting(incoming.map((u) => toRow(u))));
    return summarize(incoming, inserted, []);
  } catch (err) {
    log.warn("bulk import failed, retrying row by row", { error: err.message });
  }

  // Slow path: isolate the bad rows instead of failing the whole batch.
  const inserted = new Set();
  const failed = [];
  for (const u of incoming) {
    try {
      (await users.insertIgnoringExisting([toRow(u)])).forEach((id) => inserted.add(id));
    } catch (err) {
      if (isUniqueViolation(err, "users_reg_uq")) {
        // Registration number already taken in Supabase: keep the user, issue a new number.
        try {
          (await users.insertIgnoringExisting([toRow(u, newRegNumber(new Date(u.createdAt)))])).forEach((id) => inserted.add(id));
          continue;
        } catch (retryErr) {
          err = retryErr;
        }
      }
      failed.push({ id: u.id, reason: err.code ? `db error ${err.code}` : "import failed" });
    }
  }
  return summarize(incoming, inserted, failed);
}

function summarize(incoming, inserted, failed) {
  const failedIds = new Set(failed.map((f) => f.id));
  return {
    imported: incoming.filter((u) => inserted.has(u.id)).map((u) => u.id),
    alreadyPresent: incoming.filter((u) => !inserted.has(u.id) && !failedIds.has(u.id)).map((u) => u.id),
    failed,
  };
}
