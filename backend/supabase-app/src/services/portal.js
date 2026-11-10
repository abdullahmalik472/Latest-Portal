import { randomUUID } from "node:crypto";
import * as courses from "../repositories/courses.js";
import * as orgs from "../repositories/orgs.js";
import * as stats from "../repositories/stats.js";
import * as users from "../repositories/users.js";
import { badRequest } from "../utils/errors.js";
import { createAccount } from "./auth.js";

const isAdmin = (user) => user.role === "admin";

export const listOrgs = () => orgs.list();
export const orgDetails = () => orgs.details();
export const createOrg = ({ name }) => orgs.insert({ id: randomUUID(), name, createdAt: new Date() });

/** Admins see global numbers; everyone else sees their own organization. */
export const getStats = (user) => stats.counts(isAdmin(user) ? null : user.orgId);

export function listCourses(user, { mine } = {}) {
  if (isAdmin(user)) return courses.list();
  if (mine && user.role === "teacher") return courses.list({ teacherId: user.id });
  return courses.list({ orgId: user.orgId });
}

/** Teachers can only create courses for themselves in their own org (client values are ignored). */
export async function createCourse(user, { title, orgId, teacherId }) {
  if (user.role === "teacher") {
    orgId = user.orgId;
    teacherId = user.id;
  } else {
    if (!orgId || !teacherId) throw badRequest("VALIDATION_ERROR", "Choose an organization and a teacher");
    if (!(await users.isTeacherInOrg(teacherId, orgId))) {
      throw badRequest("TEACHER_NOT_IN_ORG", "Pick a teacher from this organization (add one first if none exist)");
    }
  }
  return courses.insert({ id: randomUUID(), orgId, teacherId, title, createdAt: new Date() });
}

export const listUsers = (filters) => users.list(filters);
export const createUser = (input) => createAccount(input);
