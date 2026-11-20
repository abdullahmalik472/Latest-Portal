import { z } from "zod";

// "as const" keeps the exact strings, so z.enum (and the Role type below) knows the 3 values, not just "string".
const ROLES = ["admin", "teacher", "student"] as const;

const email = z
  .string({ error: "Email is required" })
  .trim()
  .toLowerCase()
  .max(254, "Email is too long")
  .pipe(z.email("Enter a valid email address"));

// bcrypt only uses the first 72 bytes, so longer passwords are rejected rather than silently truncated.
const newPassword = z
  .string({ error: "Password is required" })
  .min(8, "Password must be at least 8 characters")
  .refine((s) => Buffer.byteLength(s, "utf8") <= 72, "Password must be at most 72 bytes")
  .refine((s) => /[A-Za-z]/.test(s) && /\d/.test(s), "Password must contain letters and numbers");

const name = z.string({ error: "Name is required" }).trim().min(1, "Name is required").max(120, "Name is too long");
const role = z.enum(ROLES, { error: "Choose a valid role" });
const id = (label: string) => z.uuid(`Choose a valid ${label}`);

export const registerSchema = z.object({
  name,
  email,
  password: newPassword,
  role,
  orgId: id("organization"),
  adminCode: z.string().max(200).optional(),
});

export const loginSchema = z.object({
  email,
  password: z.string({ error: "Password is required" }).min(1, "Password is required").max(200),
  orgId: id("organization").optional(),
});

export const createOrgSchema = z.object({
  name: z.string({ error: "Organization name is required" }).trim().min(2, "Organization name is too short").max(120),
});

export const createUserSchema = z.object({ name, email, password: newPassword, role, orgId: id("organization") });

export const createCourseSchema = z.object({
  title: z.string({ error: "Course title is required" }).trim().min(2, "Course title is too short").max(160),
  orgId: id("organization").optional(),
  teacherId: id("teacher").optional(),
});

export const listUsersQuery = z.object({
  role: role.optional(),
  orgId: id("organization").optional(),
});

export const listCoursesQuery = z.object({
  mine: z.enum(["1", "true"]).optional(),
});

// Query strings always arrive as text ("?snapshots=12"), so z.coerce turns them into numbers first.
export const reportQuery = z.object({
  snapshots: z.coerce
    .number({ error: "snapshots must be a number" })
    .int("snapshots must be a whole number")
    .min(1, "snapshots must be at least 1")
    .max(168, "snapshots can be at most 168 (one week of hourly snapshots)")
    .default(24),
});

/* ---------- Types generated from the schemas: never written by hand ---------- */

export type Role = z.infer<typeof role>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateUserInput = z.infer<typeof createUserSchema>;
export type CreateCourseInput = z.infer<typeof createCourseSchema>;
export type CreateOrgInput = z.infer<typeof createOrgSchema>;
export type ListUsersQuery = z.infer<typeof listUsersQuery>;
export type ListCoursesQuery = z.infer<typeof listCoursesQuery>;
export type ReportQuery = z.infer<typeof reportQuery>;
