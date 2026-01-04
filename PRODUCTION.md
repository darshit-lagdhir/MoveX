# 🚀 MoveX Operations Guide

> **Environment:** Production (Koyeb + Cloudflare)
> **DB:** PostgreSQL (Supabase)
> **Status:** Live

---

## 🏗️ 1. Deployment Architecture

We use a **"Triple-Layer"** isolation strategy.

| Layer | Host | Logic | Why? |
| :--- | :--- | :--- | :--- |
| **Edge** | Cloudflare | Static Files (`.html`, `.js`) | Unhackable (No Server). |
| **Core** | Koyeb | Node.js API (`npm start`) | Stateless. Scales with RAM. |
| **DB** | Supabase | Data + Sessions | RLS Protected. Encrypted. |

---

## 🛡️ 2. Configuration Checklist

**⚠️ Critical: Do not launch without these.**

### A. Secrets
*   [ ] `NODE_ENV=production` (Enables HSTS + Secure Cookies)
*   [ ] `SESSION_SECRET` (32+ chars random string)
*   [ ] `DATABASE_URL` (Must have `sslmode=require`)
*   [ ] `JWT_SECRET` (For legacy apps)

### B. Firewall & Access
*   [ ] `FRONTEND_URL` (CORS Whitelist)
*   [ ] `CSRF_ENABLED=true`
*   [ ] `RATE_LIMIT_LOGIN=5` (Max tries)

---

## 💾 3. Database Operations

### 📂 Schema Migrations
*We use Raw SQL files for full control.*
1.  **Write:** Create `backend/sql/018_update.sql`.
2.  **Apply:** Run via `psql`.
3.  **Verify:** Check logs for "Missing Column" errors.

### 🔐 RLS (Row Level Security)
*   **Enabled Tables:** `sessions`, `shipments`.
*   **Rule:** Users see *only* their own rows.

### 📦 Backup Strategy
*   **Daily:** Dump `users` + `shipments`.
*   **Hourly:** Supabase Auto-WAL.
*   **Monthly:** Restore test to `staging` DB.

---

## 🚨 4. Incident Response

### Case A: Site Down (503)
1.  **Check:** `/api/health`
2.  **Diagnose:**
    *   TIMEOUT → Node process crash (Check Koyeb).
    *   DB ERROR → Connection pool full.
3.  **Fix:** Restart Backend.

### Case B: Users Logged Out
1.  **Check:** `backend/src/session.js` logs.
2.  **Verify:** Is `NODE_ENV=production`? (For Secure Cookies).
3.  **Sync:** Check Server Time (NTP).

### Case C: Attack Detected
1.  **Audit:** Check `authLogging.js` for IP patterns.
2.  **Block:** The `rateLimiter` will auto-ban IPs (429).
3.  **Kill Switch:** Set `MAINTENANCE_MODE=true`.

---

## 📊 5. Maintenance Tasks

### 🧹 Auto-Cleanup
*   **Job:** Frequency **15 mins**.
*   **Action:** `DELETE FROM sessions WHERE expires_at < NOW()`.
*   **Manual Trigger:**
    ```sql
    DELETE FROM sessions WHERE expires_at < (EXTRACT(EPOCH FROM NOW()) * 1000);
    ```

### 🔍 Log Analysis Pattern
*   ✅ `[AUTH] Login Success | User: admin`
*   ❌ `[AUTH] Login Failed | Reason: Bad Password`
*   ⚠️ `[SECURITY] CORS blocked request`

---

<div align="center">
  <sub>MoveX Ops • Stable • Verified</sub>
</div>
