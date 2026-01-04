# 🚀 MoveX Production Operations & DevOps Guide

> **Target Platform:** Node.js (Koyeb/AWS) + Cloudflare Pages (Frontend)  
> **Database:** PostgreSQL (Supabase/RDS)  
> **Security Level:** Enterprise Grade

This document describes how to deploy, configure, and maintain MoveX in a live production environment. It bridges the gap between Code (`app.js`) and Infrastructure (`Koyeb`).

---

## 🏗️ 1. Deployment Architecture

MoveX uses a **"Triple-Layer"** architecture designed for resilience and security.

### Layer 1: The Edge (Frontend)
*   **Host:** Cloudflare Pages (or Netlify/Vercel).
*   **Role:** serves the static `.html`, `.css`, and `.js` files.
*   **Config:**
    *   **Build Command:** `None` (Static Site).
    *   **Output Directory:** `/` (Root).
*   **Why:** Static hosting is unhackable. There is no server to compromise on the frontend. The `admin-layout.js` router handles all navigation client-side.

### Layer 2: The Core (Backend API)
*   **Host:** Koyeb (or AWS Elastic Beanstalk / Heroku).
*   **Role:** Runs the Node.js Express server (`npm start`).
*   **Scaling:** Vertical scaling (add RAM) is preferred over horizontal initially, as the Session Store is DB-backed (Stateless App Server).
*   **Health:** Monitored via `/api/health` endpoint.
*   **Behavior:** It serves as the "Controller" for all logic, interacting with the DB and enforcing security rules.

### Layer 3: The Persistence (Database)
*   **Host:** Supabase (Managed PostgreSQL).
*   **Role:** Stores Users, Organizations, Shipments, and Active Sessions.
*   **Backup:** Point-in-Time Recovery (PITR) is enabled by Supabase.
*   **Security:** RLS (Row Level Security) prevents cross-tenant data leaks.

---

## 🛡️ 2. Security Configuration Checklist

Before going live, you **MUST** configure these environment variables. Missing any of these will result in a vulnerable or non-functional application.

### A. Critical Secrets (The Keys to the Kingdom)
| Variable | Description (Non-Coding) | Technical Requirement |
| :--- | :--- | :--- |
| `NODE_ENV` | Tells Node.js we are live. | Must be set to `production`. Triggers HSTS and Secure Cookies. |
| `SESSION_SECRET` | Used to cryptographically sign cookies. | 32+ Character Random String. **If lost, all users are logged out.** |
| `DATABASE_URL` | Connection string for DB. | Must include `sslmode=require`. |
| `JWT_SECRET` | For legacy mobile app tokens. | Random String. |

### B. Access Controls (The Firewall)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `FRONTEND_URL` | Which website can call the API? (CORS). | `https://your-movex-app.com` |
| `CSRF_ENABLED` | Turn on anti-forgery tokens? | `true` |
| `RATE_LIMIT_LOGIN` | Max login tries before ban. | `5` (per 15 min) |
| `MAINTENANCE_MODE` | **Emergency Switch**. | `false` (Set `true` to block EVERYONE). |

---

## 💾 3. Database Operations (DBA Guide)

### Schema Migrations (`backend/sql/`)
We do not use an ORM migration tool. We use **Raw SQL Files** for transparency and control.
*   **Workflow:**
    1.  Always write a new `.sql` file (e.g., `018_fix_typo.sql`). **Never edit an old one.**
    2.  Apply files sequentially using `psql` or Supabase Query Editor.
*   **Verification:** Check the `server` logs. If migration fails, the app might crash on boot due to missing columns.
*   **Rollback:** We do not automatically rollback. You must write a `019_undo_...sql` file to reverse changes manually.

### Row Level Security (RLS)
We have enabled RLS on sensitive tables (`013_enable_rls_sessions.sql`).
*   **Policy:** "Users can only see their own sessions."
*   **Benefit:** Even if a hacker performs SQL Injection, they cannot read other users' session tokens.

### Backup Strategy
*   **Daily:** Full dump of `users` and `shipments` tables.
*   **Hourly:** WAL (Write Ahead Log) archiving (automated by Supabase).
*   **Offsite:** Manually export a `.sql` dump once a week to cold storage (e.g., S3).
*   **Restore Test:** Once a month, restore the backup to a `staging` DB to ensure files are not corrupt.

---

## 🚨 4. Incident Response Playbook

What to do when things go wrong.

### Scenario A: "The Site is Down" (503 Error)
1.  **Check Health:** Visit `https://api.yourdomain.com/api/health`.
2.  **If Timeout:** The Node.js process crashed. Check Koyeb Logs for stack traces.
3.  **If DB Error:** PostgreSQL is overwhelmed. Check Connection Pool limits in `db.js`.
4.  **Action:** Restart the Backend Service via Koyeb Dashboard.

### Scenario B: "Users getting logged out randomly"
1.  **Check Session Store:** Analyze `backend/src/session.js` logs ("Cleaned up X expired sessions").
2.  **Cookie Secure:** Ensure `NODE_ENV=production`. If not, browsers drop "Secure" cookies on HTTP connections.
3.  **Time Sync:** Ensure the server time is synchronized (NTP). Clock drift causes premature cookie rejection.
4.  **Query:** Run `SELECT COUNT(*) FROM sessions;` to see if the table was truncated.

### Scenario C: "Suspicious Activity Detected"
1.  **Audit Logs:** Check the logs generated by `authLogging.js`. Look for rapid failures from one IP or specific User Account.
2.  **Rate Limiting:** If an IP is attacking, the `rateLimiter.js` middleware will throw `429`.
3.  **Nuclear Option:** Set `MAINTENANCE_MODE=true` in Koyeb env vars. This effectively "pulls the plug" on the API for everyone except connected admins with shell access.

---

## 📊 5. Monitoring & Maintenance

### Session Housekeeping
The system automatically runs a cleanup job every **15 minutes**.
*   **What it does:** Deletes rows from `sessions` where `expires_at < NOW()`.
*   **Why:** Prevents the table from growing to millions of rows, which would slow down login lookups.
*   **Manual Trigger:** You can run `DELETE FROM sessions WHERE expires_at < (EXTRACT(EPOCH FROM NOW()) * 1000);` in SQL if the job fails.

### Static Dashboard Protection
*   **Mechanism:** Middleware `protectStaticDashboards` in `app.js`.
*   **Test:** Try opening `/admin/dashboard.html` in Incognito mode. You **must** be redirected to Login. If you see the page structure, Security is broken.

### Performance Tuning
*   **Cache Headers:** The API sends strict `Cache-Control: no-store` for JSON data to prevent stale tracking info.
*   **Compression:** Ensure `compression` middleware is enabled if payloads grow large (currently disabled for simplicity).
*   **Indexing:** We used `CREATE INDEX` on `tracking_id` and `email` (username). Always check `EXPLAIN ANALYZE` on slow queries.

### Log Pattern Analysis
*   **Success:** `[AUTH] Login Success | User: admin | IP: x.x.x.x`
*   **Failure:** `[AUTH] Login Failed | User: admin | Reason: Invalid Password | IP: x.x.x.x`
*   **Attack:** `[SECURITY] CORS blocked request from: malicious-site.com`

---

<div align="center">
  <sub>MoveX Production Manual - Keep it Safe, Keep it Running</sub>
</div>
