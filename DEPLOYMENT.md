# Updating OrgPortal (local → GitHub → AWS)

How to change something in OrgPortal and publish it to the live site. Every change follows the same order:

```
1. Change and test locally  →  2. Push to GitHub  →  3. Build images on your PC  →  4. Upload and restart on the server
```

**Live site:** https://122-248-228-44.sslip.io
**Server:** AWS Lightsail `Ubuntu-1`, `122.248.228.44`, user `ubuntu`, project folder `~/Latest-Portal`
**GitHub:** https://github.com/abdullahmalik472/Latest-Portal

> The images are built on your PC, not on the server. The server has 2 GB of RAM shared with other projects, and building Next.js there can run it out of memory and crash every app on it.

---

## One-time setup on a new PC

You only need this if you are working from a PC that has never deployed before. The current PC is already set up.

1. **Docker Desktop** is installed and running.
2. **The SSH shortcut.** Save the Lightsail key, e.g. `C:\Users\<you>\Downloads\LightsailDefaultKey-ap-southeast-1.pem`, and add this to `C:\Users\<you>\.ssh\config`:
   ```
   Host ubuntu
       HostName 122.248.228.44
       User ubuntu
       IdentityFile C:\Users\<you>\Downloads\LightsailDefaultKey-ap-southeast-1.pem
   ```
   Test it: `ssh ubuntu "echo ok"`
3. **A root `.env` for building.** `docker compose build` refuses to run without these values. Only `DOMAIN` matters for the build; the passwords are placeholders here (the real ones live only on the server).
   ```
   DOMAIN=122-248-228-44.sslip.io
   MYSQL_ROOT_PASSWORD=local-placeholder
   MYSQL_PASSWORD=local-placeholder
   ```
   Save that as `.env` in the project root. It is git-ignored.

---

## Step 1: Change and test locally

Run the three parts in three terminals:

```bash
cd backend/mysql-app    && npm run dev      # http://127.0.0.1:4001
cd backend/supabase-app && npm run dev      # http://127.0.0.1:4002
cd frontend             && npm run dev      # http://localhost:3000
```

Make your change, open the app in the browser and check that it works with **both** MySQL and Supabase selected on the login page.

If you added an npm package, run `npm install <package>` inside that folder (`frontend`, `backend/mysql-app` or `backend/supabase-app`) so `package.json` and `package-lock.json` are updated. The Docker build installs from them.

---

## Step 2: Push to GitHub

From the project root:

```bash
npm run typecheck --prefix backend/mysql-app   # must pass before pushing

git status                       # check what changed; no .env files must appear
git add -A
git commit -m "Describe the change"
git push
```

---

## Step 3: Build the images on your PC

From the project root:

```bash
docker compose build frontend mysql-app supabase-app
```

You only need to build what changed: e.g. `docker compose build frontend` for a UI-only change. A full build takes a few minutes.

Save the images to a file:

```bash
docker save -o orgportal-images.tar orgportal/frontend orgportal/mysql-app orgportal/supabase-app
```

(List only the images you rebuilt. The `.tar` file is git-ignored.)

---

## Step 4: Upload and restart on the server

```bash
scp orgportal-images.tar ubuntu:~/
ssh ubuntu "docker load -i ~/orgportal-images.tar && rm ~/orgportal-images.tar"
ssh ubuntu "cd ~/Latest-Portal && git pull && docker compose up -d --no-build"
```

Then delete the local file: `del orgportal-images.tar` (PowerShell) or `rm orgportal-images.tar` (Git Bash).

> **Faster in Git Bash:** steps 3 and 4 in one compressed stream, no `.tar` file:
> ```bash
> docker save orgportal/frontend orgportal/mysql-app orgportal/supabase-app | gzip -1 | ssh ubuntu 'gunzip | docker load'
> ssh ubuntu "cd ~/Latest-Portal && git pull && docker compose up -d --no-build"
> ```
> Do **not** run this pipe in PowerShell; it corrupts binary data.

**Check it worked:**

```bash
ssh ubuntu "cd ~/Latest-Portal && docker compose ps"
```

All six services should be `Up`, the apps `(healthy)`. Then open https://122-248-228-44.sslip.io and test your change.

---

## Special cases

### Database change (new table or column)

1. Add a **new** numbered file in `backend/<app>/database/migrations/`, e.g. `007_add_phone_to_users.sql`. Do the same in the other backend if both need it (Postgres syntax for Supabase, with `enable row level security` + `revoke` like the existing files).
2. Never edit a migration that has already run. The runner detects it and stops.
3. Test locally: `npm run db:migrate` in that backend folder.
4. Deploy with steps 2–4, then apply the migration on the server:
   ```bash
   ssh ubuntu "cd ~/Latest-Portal && docker compose run --rm --no-deps mysql-app node database/migrate.js up"
   ssh ubuntu "cd ~/Latest-Portal && docker compose run --rm --no-deps supabase-app node database/migrate.js up"
   ```

### Changing a setting (`.env`)

The server's `.env` files are **not** in Git, so `git pull` never changes them. Edit them on the server:

```bash
ssh ubuntu
cd ~/Latest-Portal
nano backend/mysql-app/.env          # or backend/supabase-app/.env
docker compose up -d --no-build --force-recreate mysql-app mysql-worker     # or supabase-app supabase-worker
exit
```

In nano: `Ctrl+O`, `Enter` to save, `Ctrl+X` to exit.

Values that `docker-compose.yml` sets itself (`NODE_ENV`, `HOST`, `PORT`, `ALLOWED_ORIGINS`, `MYSQL_HOST/USER/PASSWORD/DATABASE`, `SUPABASE_APP_URL`, `TRUST_PROXY`) cannot be changed from the app `.env` files.

### Files that exist only on the server

Never delete these. They hold the secrets and the server-specific setup:

| File | Contains |
|---|---|
| `~/Latest-Portal/.env` | `DOMAIN` and the MySQL passwords |
| `~/Latest-Portal/backend/mysql-app/.env` | mysql-app secrets |
| `~/Latest-Portal/backend/supabase-app/.env` | Supabase keys |
| `~/Latest-Portal/docker-compose.override.yml` | turns off Caddy (nginx handles HTTPS), frontend on `127.0.0.1:3100`, MySQL low-memory mode and `127.0.0.1:3308` for Workbench |
| `/etc/nginx/sites-available/orgportal` | the nginx site for the domain (certificate added by certbot) |

---

## Rolling back a bad update

Before loading new images in step 4, keep the current ones as a backup:

```bash
ssh ubuntu "docker tag orgportal/frontend orgportal/frontend:prev && docker tag orgportal/mysql-app orgportal/mysql-app:prev && docker tag orgportal/supabase-app orgportal/supabase-app:prev"
```

If the update breaks the site, restore them:

```bash
ssh ubuntu "docker tag orgportal/frontend:prev orgportal/frontend && docker tag orgportal/mysql-app:prev orgportal/mysql-app && docker tag orgportal/supabase-app:prev orgportal/supabase-app"
ssh ubuntu "cd ~/Latest-Portal && docker compose up -d --no-build"
```

Then fix the problem locally and deploy again. A migration that has already run is **not** undone by a rollback; fix it with a new migration.

---

## Checking and troubleshooting

| What | Command (from your PC) |
|---|---|
| Container status | `ssh ubuntu "cd ~/Latest-Portal && docker compose ps"` |
| Logs of one service | `ssh ubuntu "cd ~/Latest-Portal && docker compose logs --tail=50 mysql-app"` |
| Cron job logs | `ssh ubuntu "cd ~/Latest-Portal && docker compose logs --tail=50 mysql-worker"` |
| Restart everything | `ssh ubuntu "cd ~/Latest-Portal && docker compose restart"` |
| RAM / CPU per container | `ssh ubuntu "docker stats --no-stream"` |
| nginx config test | `ssh ubuntu "sudo nginx -t"` |
| HTTPS certificate | renews automatically (`certbot.timer`); test with `ssh ubuntu "sudo certbot renew --dry-run"` |

Service names: `frontend`, `mysql-app`, `mysql-worker`, `supabase-app`, `supabase-worker`, `mysql`.

| Problem | Cause / fix |
|---|---|
| `docker compose build` says `set DOMAIN in .env` | The root `.env` is missing on your PC (see one-time setup). |
| Site shows **502 Bad Gateway** | The frontend container is down or still starting. Check `docker compose ps` and the `frontend` logs. |
| Login does nothing or says "Please sign in" again | You opened the site over `http://IP:port`. Always use `https://122-248-228-44.sslip.io`. |
| Change not visible after deploy | The image was not rebuilt or not uploaded. Repeat steps 3–4 for that service; hard-refresh the browser (`Ctrl+Shift+R`). |
| `Permission denied (publickey)` on ssh | The `.pem` path in `~/.ssh/config` is wrong. |
| Server very slow | Memory is full. Check `docker stats --no-stream` and `free -h`; never build images on the server. |
| `ERR_MODULE_NOT_FOUND` after renaming a file | An import still points to the old `.js` name. Update it to `.ts`. |

## Viewing the data

- **MySQL (server):** MySQL Workbench → Standard TCP/IP over SSH → SSH `122.248.228.44:22`, user `ubuntu`, the `.pem` key; MySQL `127.0.0.1:3308`, user `orgportal`, schema `orgportal`. Password: `ssh ubuntu "grep ^MYSQL_PASSWORD= ~/Latest-Portal/.env"`.
- **Supabase (cloud):** supabase.com/dashboard → project → Table Editor.
