# OrgPortal

Multi-organization school portal: a Next.js frontend with **two independent Express backends**, one on **MySQL** and one on **Supabase**. Users pick the backend on the login screen.

```
orgportal/
├─ frontend/                      Next.js app (Tailwind + lucide icons)
│  ├─ app/, components/, lib/
│  └─ next.config.mjs             proxies /api/mysql/* and /api/supabase/* to the backends
└─ backend/
   ├─ mysql-app/                  Express + MySQL     (port 4001)
   └─ supabase-app/               Express + Supabase  (port 4002)
```

Both backends expose the **same API** and are built from the same layers:

```
database/
├─ migrations/          versioned schema: 001_create_orgs.sql, 002_create_users.sql, ...
├─ seeds/               demo data only (never schema)
└─ migrate.js           migration runner (up / status / reset)
src/
├─ config/env.js        validated environment (the app refuses to start on bad config)
├─ db/                  database connection
├─ middleware/          auth (sessions, roles), security (CSRF, rate limits), validation, errors
├─ validation/          zod schemas for every request body / query
├─ repositories/        the only code that touches the database (parameterized queries)
├─ services/            business rules (identical in both apps)
├─ routes/              HTTP layer
├─ jobs/                cron jobs (also runnable once from the CLI)
├─ server.js            API process
└─ worker.js            cron process
```

---

## Quick start

### 1. MySQL backend

```bash
cd backend/mysql-app
cp .env.example .env          # fill in MYSQL_* and ADMIN_SIGNUP_CODE
npm install
npm run db:migrate            # creates the database (if missing) and applies all migrations
npm run db:seed               # optional demo data
npm run dev                   # API on http://127.0.0.1:4001
npm run worker                # cron jobs (separate terminal)
```

Create a dedicated MySQL user instead of using root:

```sql
CREATE USER 'orgportal'@'localhost' IDENTIFIED BY 'a-long-random-password';
GRANT ALL PRIVILEGES ON orgportal.* TO 'orgportal'@'localhost';
```

### 2. Supabase backend

```bash
cd backend/supabase-app
cp .env.example .env          # SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (Project Settings → API)
                              # + SUPABASE_DB_URL (Connect → connection string), used only by migrations
npm install
npm run db:migrate            # applies all migrations (each in its own transaction)
npm run db:seed               # optional demo data
npm run dev                   # API on http://127.0.0.1:4002
npm run worker                # cron jobs (separate terminal)
```

### 3. Frontend

```bash
cd frontend
cp .env.local.example .env.local   # only if the backends are not on the default ports
npm install
npm run dev                   # http://localhost:3000
```

If port 3000 is taken, run `npx next dev -p 3005` and add `http://localhost:3005` to `ALLOWED_ORIGINS` in both backend `.env` files.

### Demo accounts (after `db:seed`, shown on the login page in development only)

| Role | Email | Password |
|---|---|---|
| Admin | admin@nova.edu | Admin@12345 |
| Teacher | teacher@nova.edu | Teacher@123 |
| Student | student@nova.edu | Student@123 |
| Multi-org | hamza@mail.com | Hamza@Nova1 (Nova) · Hamza@Orion1 (Orion) |

Admin self-registration requires `ADMIN_SIGNUP_CODE` from the backend `.env`. It is no longer shown in the UI.

---

## Database migrations

The schema lives only in `database/migrations/` (one change per numbered file). Demo data lives only in `database/seeds/`.

| Command | What it does |
|---|---|
| `npm run db:migrate` | Applies pending migrations in order and records each in `schema_migrations` with a checksum |
| `npm run db:migrate:status` | Lists applied and pending migrations |
| `npm run db:seed` | Inserts demo data (needs migrations first; refused in production) |
| `npm run db:reset -- --yes` | **Cleans the database**: drops this app's tables (and only those), then re-applies every migration. Refused when `NODE_ENV=production`. |

Rules:

- **Changing the schema.** Add a new file with the next number, e.g. `007_add_phone_to_users.sql`, then run `db:migrate`.
- **Never edit an applied migration.** The runner compares checksums and stops with an error if an applied file changed.
- **How each database applies them.**
  - Supabase: every migration runs in a transaction, so a failing file is fully rolled back. The tracking table lives in a separate `orgportal_meta` schema that the Supabase REST API does not expose. Each table's migration also enables RLS and revokes client access, so no table is ever publicly readable, even briefly.
  - MySQL: DDL auto-commits, which is why each file holds a single table/change.
- **Concurrency.** Two people or servers migrating at the same time are serialised with a lock (`GET_LOCK` / `pg_advisory_lock`).
- **Supabase without `SUPABASE_DB_URL`.** You can paste the migration files into the Supabase SQL editor in order, but then nothing tracks what was applied.

---

## API (identical in both backends)

| Method | Path | Access |
|---|---|---|
| POST | `/api/auth/register` | public (rate-limited) |
| POST | `/api/auth/login` | public (rate-limited) |
| POST | `/api/auth/logout` | any |
| GET | `/api/auth/me` | signed in |
| GET | `/api/orgs` | public (names for the sign-up form) |
| GET | `/api/stats` | signed in (admins: global, others: own org) |
| GET | `/api/courses[?mine=1]` | signed in |
| POST | `/api/courses` | admin, teacher (teachers: always self + own org) |
| POST | `/api/orgs` | admin |
| GET | `/api/orgs/details` | admin |
| GET/POST | `/api/users` | admin |
| GET | `/api/reports/registrations` | admin |
| GET | `/api/migration/status` | admin (mysql-app only) |
| POST | `/internal/migrations/users` | service token (supabase-app only, not proxied) |

---

## Cron jobs (`npm run worker`)

| Job | App | Default schedule | Run once |
|---|---|---|---|
| Registration report: counts for the last 10 min / 1 h / 1 d / 7 d / 30 d, stored as a snapshot and shown on the Reports page | both | hourly `0 * * * *` | `npm run job:report` |
| Delete expired sessions | both | daily `30 3 * * *` | `npm run job:cleanup-sessions` |
| **One-way user migration MySQL → Supabase** | mysql-app | every 15 min `*/15 * * * *` | `npm run job:migrate-users` |

Schedules and the timezone come from `.env` (`REPORT_CRON`, `MIGRATION_CRON`, `CRON_TIMEZONE`, ...). The worker is a separate process, so you can scale API instances without running every job several times.

### How the migration works

1. mysql-app's worker selects users with `migrated_at IS NULL` (batches of `MIGRATION_BATCH_SIZE`).
2. It POSTs them to supabase-app `/internal/migrations/users` with `Authorization: Bearer $MIGRATION_TOKEN`.
3. supabase-app matches organizations by name (creating missing ones) and inserts users **keeping their id, registration number and bcrypt hash**, so migrated users sign in to Supabase with their existing password.
4. mysql-app stores `migrated_at` for every user Supabase confirmed.

The migration is:

- **One way.** Nothing flows back, and MySQL rows are never deleted.
- **Idempotent.** Existing ids are skipped, so re-running is safe.
- **Locked.** MySQL `GET_LOCK` stops two runs from overlapping.
- **Fault tolerant.** Failing rows are retried up to 5 times, with the error recorded in `users.migration_error`.

Each run is logged in `user_migration_runs`, and progress appears on the Reports page.

To enable it:

1. Generate a token: `node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"`.
2. Put the same value in `MIGRATION_TOKEN` in **both** `.env` files.
3. In mysql-app, set `MIGRATION_ENABLED=true` and `SUPABASE_APP_URL`.

---

## Deploy with Docker (AWS EC2)

> The live server (AWS Lightsail, behind nginx) and the step-by-step update process are documented in [DEPLOYMENT.md](DEPLOYMENT.md).

```
Internet ──80/443──▶ caddy (auto HTTPS) ──▶ frontend ──▶ mysql-app ──▶ mysql (volume)
                                                     └──▶ supabase-app ──▶ Supabase
                     mysql-worker, supabase-worker (cron)
```

Only Caddy publishes ports. The APIs, workers and MySQL sit on a private Docker network.

| Service | Image | Notes |
|---|---|---|
| `caddy` | caddy:2.8 | Let's Encrypt certificate for `$DOMAIN`, HTTP→HTTPS redirect, HSTS |
| `frontend` | `frontend/Dockerfile` | Next.js standalone server |
| `mysql-app`, `mysql-worker` | `backend/mysql-app/Dockerfile` | API and cron jobs (same image) |
| `supabase-app`, `supabase-worker` | `backend/supabase-app/Dockerfile` | API and cron jobs (same image) |
| `mysql` | mysql:8.4 | data in the `mysql_data` volume |

Configuration on the server (all git-ignored):

- `.env`: `DOMAIN`, `MYSQL_ROOT_PASSWORD`, `MYSQL_PASSWORD` (see `.env.example`).
- `backend/mysql-app/.env` and `backend/supabase-app/.env`: app secrets.

Container networking values (hosts, ports, `NODE_ENV=production`, `ALLOWED_ORIGINS=https://$DOMAIN`) are set in `docker-compose.yml` and override the app `.env` files.

```bash
docker compose up -d --build                                          # build and start everything
docker compose run --rm mysql-app node database/migrate.js up         # MySQL migrations
docker compose run --rm supabase-app node database/migrate.js up      # Supabase migrations
docker compose run --rm mysql-app node database/seeds/demo.js --force # optional demo data
docker compose ps                                                     # status
docker compose logs -f mysql-worker                                   # follow a service's logs
git pull && docker compose up -d --build                              # deploy an update
```

---

## Security

| Threat | Mitigation |
|---|---|
| Token theft via XSS | The session token lives only in an **HttpOnly** cookie. JavaScript never sees it, and it is not in any JSON response. |
| CSRF | Cookies are **SameSite=Strict**. State-changing requests also need an allowed `Origin` (and are rejected when `Sec-Fetch-Site: cross-site`). Bodies must be JSON. |
| Cookie leaking to the wrong service | Each cookie is scoped to its backend's path (`/api/mysql` or `/api/supabase`). |
| Stolen database dump | Passwords are hashed with bcrypt (cost 12). Sessions store only the SHA-256 of the token. |
| Session hijack after logout | Sessions are server-side: logout deletes the row, so a replayed cookie gets 401. Sessions expire after 8 h (`SESSION_TTL_HOURS`) and a fresh token is issued on every login. |
| Brute force | Failed logins are limited to 10 per 15 min per IP, registrations to 10 per hour, and the API overall to 300 per minute. |
| Account enumeration | Login always answers "Invalid email or password" and takes constant time for unknown emails. The organizations an email belongs to are revealed only **after** the password is verified. |
| SQL injection | All queries are parameterized (mysql2 placeholders / supabase-js filters). Every input is validated with zod (types, lengths, enums, UUIDs). |
| Privilege escalation | Roles are enforced on the server for every route. Teachers can only create courses for themselves. Admin sign-up needs a secret code (compared in constant time). |
| Supabase anon key abuse | RLS is enabled on every table with no policies, and `anon`/`authenticated` privileges are revoked. Only the server holds the service-role key. |
| Exposed services | APIs bind to `127.0.0.1` by default, send no CORS headers, use helmet headers and return `no-store`. Errors never leak stack traces in production. |
| Clickjacking | The frontend sends `X-Frame-Options: DENY` and CSP `frame-ancestors 'none'`. |

**Production checklist**

- Serve everything over HTTPS (cookies get `Secure` automatically when `NODE_ENV=production`).
- Use long random values for `ADMIN_SIGNUP_CODE` and `MIGRATION_TOKEN`.
- Never commit `.env` files (they are git-ignored).
- Keep `SUPABASE_SERVICE_ROLE_KEY` server-side only.
- Use `https://` for `SUPABASE_APP_URL` when the backends run on different hosts. The migration refuses plain HTTP to non-local hosts in production.
- Rate limits use in-memory counters, so each API instance counts separately. If you run several instances behind a load balancer, switch to a shared store (e.g. `rate-limit-redis`).

**Known trade-off.** The product rule "passwords must be unique per email" means registration has to tell a user when an email+password pair already exists. That leaks as much as a login attempt would, so registration is rate-limited even more strictly than login.
