// Thin fetch client for the two Express backends (reached through the Next.js proxy).
// The session lives in an HttpOnly cookie: this code never sees or stores a token.

export const DB_KEYS = ["mysql", "supabase"];
export const UNAUTHORIZED_EVENT = "orgportal:unauthorized";

export class ApiError extends Error {
  constructor(message, { status = 0, code, details } = {}) {
    super(message);
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

async function request(db, path, { method = "GET", body, signal } = {}) {
  if (!DB_KEYS.includes(db)) throw new ApiError("Unknown database");
  let res;
  try {
    res = await fetch(`/api/${db}${path}`, {
      method,
      signal,
      credentials: "same-origin",
      cache: "no-store",
      headers: body !== undefined ? { "Content-Type": "application/json" } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch (err) {
    if (err.name === "AbortError") throw err;
    throw new ApiError("Cannot reach the server. Check your connection.", { code: "NETWORK" });
  }

  const data = res.status === 204 ? null : await res.json().catch(() => null);
  if (res.ok) return data;

  const err = data?.error;
  if (!err && res.status >= 500) {
    throw new ApiError(`The ${db === "mysql" ? "MySQL" : "Supabase"} backend is not responding. Is it running?`, { status: res.status, code: "UNAVAILABLE" });
  }
  // Session expired / revoked mid-use: let the auth provider sign the UI out.
  if (res.status === 401 && !path.startsWith("/auth/")) {
    window.dispatchEvent(new CustomEvent(UNAUTHORIZED_EVENT, { detail: { db } }));
  }
  throw new ApiError(err?.message || "Request failed", { status: res.status, code: err?.code, details: err?.details });
}

const qs = (params) => {
  const s = new URLSearchParams(Object.entries(params).filter(([, v]) => v !== undefined && v !== "")).toString();
  return s ? `?${s}` : "";
};

export function createClient(db) {
  const get = (path, opts) => request(db, path, opts);
  const post = (path, body) => request(db, path, { method: "POST", body });
  return {
    db,
    me: () => get("/auth/me"),
    login: (body) => post("/auth/login", body),
    register: (body) => post("/auth/register", body),
    logout: () => request(db, "/auth/logout", { method: "POST" }),

    orgs: () => get("/orgs").then((d) => d.orgs),
    orgDetails: () => get("/orgs/details").then((d) => d.orgs),
    addOrg: (body) => post("/orgs", body),

    stats: () => get("/stats").then((d) => d.stats),
    courses: ({ mine } = {}) => get(`/courses${qs({ mine: mine ? "1" : undefined })}`).then((d) => d.courses),
    addCourse: (body) => post("/courses", body),

    users: (filters = {}) => get(`/users${qs(filters)}`).then((d) => d.users),
    addUser: (body) => post("/users", body),

    registrations: () => get("/reports/registrations"),
    migrationStatus: () => get("/migration/status"),
  };
}
