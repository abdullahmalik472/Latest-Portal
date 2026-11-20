import { randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { env } from "../config/env.js";
import * as orgs from "../repositories/orgs.js";
import * as sessions from "../repositories/sessions.js";
import * as users from "../repositories/users.ts";
import { hashToken, newSessionToken, safeEqual } from "../utils/crypto.js";
import { HttpError, badRequest, conflict, forbidden } from "../utils/errors.js";
import type { Credentials, PublicUser } from "../types/domain.ts";
import type { CreateUserInput, LoginInput, RegisterInput } from "../validation/schemas.ts";

// Compared against when the email is unknown, so "no such email" and "wrong password" take the same time.
const DUMMY_HASH = bcrypt.hashSync("timing-equaliser-not-a-real-password", env.BCRYPT_ROUNDS);

const invalidCredentials = () => new HttpError(401, "INVALID_CREDENTIALS", "Invalid email or password");

/** Request details stored with a session. */
export interface RequestMeta {
  ip: string | null;
  userAgent: string | null;
}

interface Session {
  id: string;
  createdAt: Date;
  expiresAt: Date;
}

const sessionView = (s: Session) => ({ id: s.id, createdAt: s.createdAt.toISOString(), expiresAt: s.expiresAt.toISOString() });

/**
 * Every possible result of checking a password. "kind" is the discriminant:
 * once you check it, TypeScript knows exactly which other fields exist.
 */
export type LoginDecision =
  | { kind: "invalid" }
  | { kind: "org_required"; orgIds: string[] }
  | { kind: "ok"; accountId: string };

/**
 * Creates an account. Rules:
 *  - the same email may exist in many orgs (and more than once in one org),
 *  - but every account with that email must have a different password.
 */
export async function createAccount({ name, email, password, role, orgId }: CreateUserInput): Promise<PublicUser> {
  if (!(await orgs.findById(orgId))) throw badRequest("ORG_NOT_FOUND", "Organization not found");

  for (const acc of await users.findCredentialsByEmail(email)) {
    if (await bcrypt.compare(password, acc.passwordHash)) {
      throw conflict("PASSWORD_REUSED", "This password is already used by another account with this email. Choose a different one.");
    }
  }

  const passwordHash = await bcrypt.hash(password, env.BCRYPT_ROUNDS);
  const user = await users.insert({ id: randomUUID(), orgId, name, email, passwordHash, role, createdAt: new Date() });
  // Narrowing: insert() returns PublicUser | null. After this check TypeScript knows it is PublicUser.
  if (!user) throw new Error("Account was created but could not be read back");
  return user;
}

async function startSession(user: PublicUser, meta: RequestMeta) {
  const token = newSessionToken();
  const now = new Date();
  const session: Session = { id: randomUUID(), createdAt: now, expiresAt: new Date(now.getTime() + env.SESSION_TTL_HOURS * 3_600_000) };
  await sessions.insert({
    ...session,
    userId: user.id,
    tokenHash: hashToken(token),
    ip: meta.ip ?? null,
    userAgent: meta.userAgent ?? null,
  });
  return { token, user, session: sessionView(session) };
}

export async function register(input: RegisterInput, meta: RequestMeta) {
  if (input.role === "admin" && !safeEqual(input.adminCode ?? "", env.ADMIN_SIGNUP_CODE)) {
    throw forbidden("INVALID_ADMIN_CODE", "Invalid admin code");
  }
  const user = await createAccount(input);
  return startSession(user, meta);
}

/**
 * Pure decision: which accounts does this password unlock? No HTTP, no cookies, so it is easy to test.
 * Email + password identify the account (passwords are unique per email). Only if the password matches
 * accounts in several orgs (possible after a migration) must the caller pick one of those orgs.
 */
export async function decideLogin(candidates: Credentials[], password: string, orgId?: string): Promise<LoginDecision> {
  const matches: Credentials[] = [];
  for (const acc of candidates) if (await bcrypt.compare(password, acc.passwordHash)) matches.push(acc);
  const scoped = orgId ? matches.filter((m) => m.orgId === orgId) : matches;
  if (!scoped.length) return { kind: "invalid" };

  const orgIds = [...new Set(scoped.map((m) => m.orgId))];
  if (orgIds.length > 1) return { kind: "org_required", orgIds };

  return { kind: "ok", accountId: scoped[0].id }; // candidates are ordered oldest first
}

export async function login({ email, password, orgId }: LoginInput, meta: RequestMeta) {
  const candidates = await users.findCredentialsByEmail(email);
  if (!candidates.length) {
    await bcrypt.compare(password, DUMMY_HASH);
    throw invalidCredentials();
  }

  const decision = await decideLogin(candidates, password, orgId);
  switch (decision.kind) {
    case "invalid":
      throw invalidCredentials();

    case "org_required":
      // Narrowed: only in this branch does TypeScript allow decision.orgIds.
      throw conflict("ORG_REQUIRED", "This account exists in several organizations. Choose one.", {
        orgs: await orgs.findByIds(decision.orgIds),
      });

    case "ok": {
      const user = await users.findById(decision.accountId);
      if (!user) throw invalidCredentials(); // the account was deleted between the two queries
      return startSession(user, meta);
    }

    default: {
      // Exhaustiveness check: if a new kind is added to LoginDecision and not handled above, this line fails to compile.
      const unhandled: never = decision;
      throw new Error(`Unhandled login decision: ${JSON.stringify(unhandled)}`);
    }
  }
}

export async function logout(token: string | null | undefined): Promise<void> {
  if (token) await sessions.deleteByTokenHash(hashToken(token));
}

export const me = ({ user, session }: { user: PublicUser; session: Session }) => ({ user, session: sessionView(session) });

