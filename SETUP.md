# Nomade — Setup guide

## Part 2: Environment (`.env`) — step by step

The server reads configuration from **`server/.env`**. You already have this file; you only need to set the right values.

### Where is the file?

- **Full path:** `nomade/server/.env`
- **From project root:** `server/.env`
- **From terminal (project root):**  
  `ls server/.env`  
  If you see the file, it exists.

### What you must set (minimum to run)

Only two variables are required to run the app:

1. **`DATABASE_URL`** — connection string for the database.
2. **`JWT_SECRET`** — secret used to sign tokens (any long random string).

---

### Option A: Test without installing PostgreSQL (SQLite)

Use a **file-based SQLite database** so you don’t install or run PostgreSQL.

1. Open **`server/.env`** in your editor.
2. Set exactly:

   ```env
   DATABASE_URL="file:./dev.db"
   JWT_SECRET="dev-secret-change-in-production-min-32-chars"
   ```

3. Use the SQLite schema and create the DB:

   ```bash
   cd /Users/usuario/nomade
   npm run db:sqlite:push
   ```

4. Then start the app:

   ```bash
   npm run dev
   ```

The database file is created at **`server/prisma/dev.db`**. You can delete that file to reset the DB. To inspect data: `npm run db:sqlite:studio`.

---

### Option B: Use PostgreSQL (local or cloud)

#### B1. Local PostgreSQL

If PostgreSQL is installed and running on your machine:

1. Open **`server/.env`**.
2. Set:

   ```env
   DATABASE_URL="postgresql://USER:PASSWORD@localhost:5432/nomade?schema=public"
   JWT_SECRET="your-super-secret-key-change-in-production"
   ```

   Replace:

   - **USER** — your PostgreSQL username (often your macOS username or `postgres`).
   - **PASSWORD** — your PostgreSQL password.
   - **nomade** — database name (create it first if it doesn’t exist).

   Example (user `postgres`, password `mypass`, database `nomade`):

   ```env
   DATABASE_URL="postgresql://postgres:mypass@localhost:5432/nomade?schema=public"
   ```

3. Create the database (if needed):

   ```bash
   # macOS with Homebrew PostgreSQL:
   createdb nomade

   # Or with psql:
   psql -U postgres -c "CREATE DATABASE nomade;"
   ```

4. Apply schema:

   ```bash
   npm run db:push
   ```

#### B2. Free cloud PostgreSQL (no local install)

You can use a free hosted Postgres so you don’t install anything locally.

1. **Neon** (recommended): https://neon.tech  
   - Sign up → Create project → copy the connection string.  
   - It looks like:  
     `postgresql://user:password@ep-xxx.region.aws.neon.tech/neondb?sslmode=require`

2. **Supabase**: https://supabase.com  
   - New project → Settings → Database → Connection string (URI).

3. Put that string in **`server/.env`** as:

   ```env
   DATABASE_URL="postgresql://...."
   JWT_SECRET="your-super-secret-key-change-in-production"
   ```

4. From project root:

   ```bash
   npm run db:push
   ```

---

### JWT_SECRET — what to put

- **Development:** any long string (e.g. `dev-secret-change-in-production-min-32-chars`).
- **Production:** generate a random string, e.g.  
  `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`

No need to set Google/CalDAV variables for basic booking; you can leave them commented or empty.

---

### Check that Part 2 worked

1. **SQLite:**  
   - `server/.env` has `DATABASE_URL="file:./dev.db"` and a `JWT_SECRET`.  
   - You ran `npm run db:sqlite:push` and see `server/prisma/dev.db`.

2. **PostgreSQL:**  
   - `server/.env` has a real `DATABASE_URL` (local or cloud) and `JWT_SECRET`.  
   - You ran `npm run db:push` and it finished without errors.

3. **Server starts:**  
   - From project root: `npm run dev:server`  
   - You see: `Server listening on http://localhost:3001`  
   - In another terminal: `curl http://localhost:3001/health` → `{"ok":true}`  

If the server fails with “Can’t reach database” or “Invalid DATABASE_URL”, double‑check the value in `server/.env` (no extra spaces, quotes correct).

---

## Quick reference: after Part 2

| Goal              | Command / action |
|-------------------|------------------|
| Use SQLite (no PG)| Set `DATABASE_URL="file:./dev.db"` in `server/.env`, then `npm run db:sqlite:push` |
| Use PostgreSQL    | Set `DATABASE_URL` to your Postgres URL in `server/.env`, then `npm run db:push` |
| Start app         | `npm run dev` (client + server) or `npm run dev:server` (API only) |
| Add sample data   | `npm run db:studio --workspace=server` → Staff, WorkingHours, Service |
