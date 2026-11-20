import { Router } from "express";
import { authenticate, requireRole } from "../middleware/auth.js";
import { validate } from "../middleware/validate.js";
import * as portal from "../services/portal.js";
import { registrationReport } from "../services/reports.ts";
import { createCourseSchema, createOrgSchema, createUserSchema, listCoursesQuery, listUsersQuery, reportQuery } from "../validation/schemas.ts";

const router = Router();
const admin = requireRole("admin");

// Public: organization names for the sign-up form.
router.get("/orgs", async (_req, res) => res.json({ orgs: await portal.listOrgs() }));

// Everything below requires a valid session.
router.use(authenticate);

router.get("/stats", async (req, res) => res.json({ stats: await portal.getStats(req.auth.user) }));

router.get("/courses", validate(listCoursesQuery, "query"), async (req, res) => {
  res.json({ courses: await portal.listCourses(req.auth.user, { mine: Boolean(req.valid.query.mine) }) });
});

router.post("/courses", requireRole("admin", "teacher"), validate(createCourseSchema), async (req, res) => {
  res.status(201).json({ course: await portal.createCourse(req.auth.user, req.valid.body) });
});

router.post("/orgs", admin, validate(createOrgSchema), async (req, res) => {
  res.status(201).json({ org: await portal.createOrg(req.valid.body) });
});

router.get("/orgs/details", admin, async (_req, res) => res.json({ orgs: await portal.orgDetails() }));

router.get("/users", admin, validate(listUsersQuery, "query"), async (req, res) => {
  res.json({ users: await portal.listUsers(req.valid.query) });
});

router.post("/users", admin, validate(createUserSchema), async (req, res) => {
  res.status(201).json({ user: await portal.createUser(req.valid.body) });
});

router.get("/reports/registrations", admin, validate(reportQuery, "query"), async (req, res) => {
  res.json(await registrationReport(req.valid.query));
});

export default router;
