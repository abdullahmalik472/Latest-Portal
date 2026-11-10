// Demo data. IDs are fixed and identical in both backends, so the MySQL -> Supabase migration
// recognises demo users as "already present" instead of duplicating them.
const DAY = 1440;

export const SEED_ORGS = [
  { id: "00000000-0000-4000-8000-000000000001", name: "Nova Academy" },
  { id: "00000000-0000-4000-8000-000000000002", name: "Orion Institute" },
  { id: "00000000-0000-4000-8000-000000000003", name: "Zenith University" },
];

const [NOVA, ORION, ZENITH] = SEED_ORGS.map((o) => o.id);

export const SEED_USERS = [
  { id: "00000000-0000-4000-8000-000000000101", name: "Ayesha Khan", email: "admin@nova.edu", password: "Admin@12345", role: "admin", orgId: NOVA, minutesAgo: 20 * DAY },
  { id: "00000000-0000-4000-8000-000000000102", name: "Bilal Ahmed", email: "teacher@nova.edu", password: "Teacher@123", role: "teacher", orgId: NOVA, minutesAgo: 6 * DAY },
  { id: "00000000-0000-4000-8000-000000000103", name: "Sara Ali", email: "student@nova.edu", password: "Student@123", role: "student", orgId: NOVA, minutesAgo: 2 * DAY },
  { id: "00000000-0000-4000-8000-000000000104", name: "Hamza Raza", email: "hamza@mail.com", password: "Hamza@Nova1", role: "student", orgId: NOVA, minutesAgo: 180 },
  { id: "00000000-0000-4000-8000-000000000105", name: "Hamza Raza", email: "hamza@mail.com", password: "Hamza@Orion1", role: "teacher", orgId: ORION, minutesAgo: 40 },
  { id: "00000000-0000-4000-8000-000000000106", name: "Mina Shah", email: "mina@orion.edu", password: "Mina@12345", role: "admin", orgId: ORION, minutesAgo: 7 },
  { id: "00000000-0000-4000-8000-000000000107", name: "Omar Farooq", email: "omar@zenith.edu", password: "Omar@12345", role: "student", orgId: ZENITH, minutesAgo: 3 },
].map((u, i) => ({ ...u, reg: `REG-2026-${String(i + 1).padStart(4, "0")}` }));

export const SEED_COURSES = [
  { id: "00000000-0000-4000-8000-000000000201", title: "Web Development", orgId: NOVA, teacherId: SEED_USERS[1].id, minutesAgo: 5 * DAY },
  { id: "00000000-0000-4000-8000-000000000202", title: "Databases 101", orgId: NOVA, teacherId: SEED_USERS[1].id, minutesAgo: 4 * DAY },
  { id: "00000000-0000-4000-8000-000000000203", title: "Data Structures", orgId: ORION, teacherId: SEED_USERS[4].id, minutesAgo: DAY },
];

export const minutesAgo = (m) => new Date(Date.now() - m * 60_000);
