import * as sessions from "../repositories/sessions.js";
import { log } from "../utils/log.js";

export async function runSessionCleanup() {
  const deleted = await sessions.deleteExpired(new Date());
  log.info("expired sessions removed", { deleted });
  return { deleted };
}
