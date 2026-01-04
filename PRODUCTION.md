# MoveX Production Guide

> **Last Updated:** January 2, 2026  
> **Version:** 1.1.0  
> **Status:** Production-Ready

This document provides a complete guide for running MoveX in a production environment. It covers database setup, security configuration, deployment options, and maintenance procedures.

---

## Table of Contents

1. [What "Production-Ready" Means for MoveX](#section-1-what-production-ready-means-for-movex)
2. [Current Architecture Overview](#section-2-current-architecture-overview)
3. [Supabase Setup Guide](#section-3-supabase-setup-guide-step-by-step)
4. [Environment Variables List and Purpose](#section-4-environment-variables-list-and-purpose)
5. [Database Structure Overview](#section-5-database-structure-overview)
6. [Storage Strategy for Photos](#section-6-storage-strategy-for-photos)
7. [Security Measures Applied](#section-7-security-measures-applied)
8. [Deployment Notes](#section-8-deployment-notes)
9. [Common Mistakes to Avoid](#section-9-common-mistakes-to-avoid)
10. [How to Safely Make Future Changes](#section-10-how-to-safely-make-future-changes)
11. [Appendix A: Useful Commands](#appendix-a-useful-commands)
12. [Appendix B: Troubleshooting](#appendix-b-troubleshooting)
13. [Appendix C: Changelog](#appendix-c-changelog)

---

## Section 1: What "Production-Ready" Means for MoveX

"Production-Ready" for MoveX means the application can:

### ✅ Safety Requirements
- **Run in public** without exposing sensitive data
- **Handle real users** with proper authentication
- **Store data securely** in a managed database
- **Recover from errors** without crashing
- **Resist common attacks** (XSS, CSRF, SQL injection, brute force)

### ✅ Configuration Requirements
- All secrets stored in environment variables
- No hardcoded credentials anywhere
- SSL/TLS enabled for database connections
- Secure cookie settings for production

### ✅ Operational Requirements
- Clear logging for debugging (without sensitive data)
- Graceful error handling
- Connection pooling and reconnection logic
- Rate limiting on sensitive endpoints

### ❌ What Production-Ready Does NOT Mean
- The application is feature-complete
- No more development needed
- Everything is optimized for scale
- Deployment is complete

**Production-Ready = Safe to deploy, not finished.**

---

## Section 2: Current Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ index.html  │  │ login.html   │  │ admin/*.html     │   │
│  │ (Landing)   │  │ (Auth UI)    │  │ (Dashboard)      │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                          │                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    js/*.js                             │  │
│  │  auth-api.js | admin-layout.js | admin-core.js         │  │
│  │  dashboard-guard.js | animations.js                    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS (port 4000)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              backend/src/app.js                      │    │
│  │         (Express Server - Entry Point)               │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    MIDDLEWARE                          │  │
│  │  CORS | Sessions | Security Headers | Rate Limiting   │  │
│  │  Cookie Parser | Static File Protection | CSRF        │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      ROUTES                            │  │
│  │  /api/auth/* | /api/dashboard/* | /api/mfa/*          │  │
│  │  /api/me | /api/organization/*                        │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    SESSION STORE                       │  │
│  │           backend/src/session.js (DB-backed)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ PostgreSQL Protocol (port 5432/6543)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PostgreSQL (Supabase)                   │    │
│  │  Tables: users, organizations, password_resets       │    │
│  └─────────────────────────────────────────────────────┘    │
│                                                              │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              Supabase Storage                        │    │
│  │  Buckets: shipment-photos (Private)                  │    │
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

### Key Files

| File | Purpose |
|------|---------|
| `backend/src/app.js` | Main Express server entry point |
| `backend/src/config/db.js` | Database connection configuration |
| `backend/src/session.js` | Session store (DB-backed PostgreSQL) |
| `backend/src/controllers/auth.controller.js` | Authentication logic |
| `backend/routes/*.js` | API route handlers |
| `backend/middleware/*.js` | Security & validation middleware |
| `.env` | Environment configuration (local only) |
| `.env.example` | Template for environment variables |


---

---

---

## Section 3: The Active Defense System (Security Architecture Deep Dive)

MoveX employs a **"Zero-Trust, Defense-in-Depth"** strategy. We assume the network is hostile and every request is potentially malicious.

### 3a. Backend Security Pipeline (The Iron Gate)
Every single request hitting `backend/src/app.js` is processed by these layers *before* it reaches any business logic:

1.  **Helmet (Header Hardening)**
    *   **Why?** Browsers have dangerous defaults (like allowing iframes).
    *   **Config:**
        *   `X-Frame-Options: DENY`: Prevents Clickjacking attacks where your site is essentially "painted" over a malicious site.
        *   `Content-Security-Policy`: Disables `eval()` and blocks scripts from unauthorized domains (e.g., hacker-cdn.com).
        *   `Strict-Transport-Security (HSTS)`: Tells the browser "Only talk to me over HTTPS" for the next year.

2.  **CORS (Origin Verification)**
    *   **Why?** Prevents malicious websites from making API calls on behalf of your logged-in users.
    *   **Config:** We strictly check the `Origin` header against `process.env.FRONTEND_URL`. If they don't match, the request is dropped instantly.

3.  **Rate Limiting (Anti-Abuse)**
    *   **Why?** Prevents Brute Force attacks and Denial of Service (DoS).
    *   **Rules:**
        *   **Login Endpoints:** Stricter limit (5 reqs / 15 mins). Prevents password guessing.
        *   **General API:** Looser limit (100 reqs / 15 mins). Allows normal usage but stops scrapers.

4.  **Static Firewall (`protectStaticDashboards`)**
    *   **Why?** Static HTML files usually aren't protected by backend logic.
    *   **Logic:** This middleware intercepts `GET *.html`. It pauses the request, decrypts the session cookie, checks the DB, and *only then* serves the file. Unauthenticated users get a `401` immediately.

### 3b. Client-Side Countermeasures
We don't trust the browser, but we make it hard to tamper with.

*   **Anti-Tamper (`js/security/anti-tamper.js`):**
    *   **Logic:** Monitors the difference between `window.outerWidth` and `window.innerWidth`. A large difference usually means the DevTools sidebar is open.
    *   **Action:** If detected, it replaces the entire DOM with a red warning screen and forces a reload loops to detach debuggers.

*   **Device Binding (`js/security/device-binding.js`):**
    *   **Logic:** When you log in, we fingerprint your device (Canvas hash + User Agent + Screen Resolution).
    *   **Check:** Every subsequent request sends this fingerprint in a header. If the session cookie is stolen and used on a hacker's laptop, the fingerprint won't match, and the server rejects it.

---

## Section 4: Database & Storage Configuration

### 4a. Supabase Setup Guide (Comprehensive Walkthrough)
Follow these exact steps to provision a production-ready database.

**Step 1: Project Creation**
1.  Log in to [supabase.com](https://supabase.com).
2.  Click **"New Project"**.
3.  **Organization:** Select your default org.
4.  **Name:** `movex-production`.
5.  **Database Password:** click "Generate" and **COPY IT** to a notepad. You cannot see it again.
6.  **Region:** Select the region physically closest to your users (e.g., `Mumbai`).
7.  Click **"Create new project"**.

**Step 2: Get Connection Details**
1.  Wait for the project to finish "Provisioning" (about 2 mins).
2.  Go to **Settings** (Gear Icon) -> **Database**.
3.  Scroll down to **Connection String**.
4.  Click **"URI"** tab.
5.  Copy the string. It looks like: `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:5432/postgres`.
6.  **CRITICAL:** Change port `5432` to `6543` (Connection Pooler) for better performance.
7.  **CRITICAL:** Append `?sslmode=require` to the end.

**Step 3: Run SQL Migrations**
1.  Go to the **SQL Editor** tab (Icon with two brackets `[ ]`).
2.  Open the files in your local `/backend/sql/` folder.
3.  Copy/Paste and Run them in this EXACT order:
    *   `001_init_users.sql` (Creates base structure)
    *   `011_create_shipments.sql` (Add shipment logic)
    *   `017_franchise_updates.sql` (Final patches)

**Step 4: Configure Storage**
1.  Go to **Storage** tab (Folder Icon).
2.  Click **"New Bucket"**.
3.  **Name:** `shipment-photos`.
4.  **Public bucket:** OFF (Unchecked).
5.  Click **"Save"**.

### 4b. Environment Variables Reference
Ensure all these are set in your deployment platform.

| Variable | Required? | Description | Example / Default |
| :--- | :--- | :--- | :--- |
| `NODE_ENV` | **YES** | Sets app to secure mode. | `production` |
| `PORT` | **YES** | Port to listen on. | `4000` |
| `DATABASE_URL` | **YES** | Full Postgres connection string. | `postgresql://...?sslmode=require` |
| `SESSION_SECRET` | **YES** | Used to sign session cookies. | Random 32+ char string |
| `JWT_SECRET` | **YES** | Used for API tokens (if enabled). | Random 32+ char string |
| `FRONTEND_URL` | **YES** | URL for CORS whitelisting. | `https://movex.app` |
| `SUPABASE_SERVICE_KEY`| No | Required only if using Photo Uploads. | `eyJ...` (from API Settings) |
| `MAINTENANCE_MODE` | No | Kill switch for the frontend. | `false` |

---

## Section 5: Operations Manual (SOPs)

### 5a. Routine Maintenance Scripts
Copy-paste these into the Supabase SQL Editor to perform maintenance.

**SCRIPT 1: Prune Expired Sessions**
*Use this if the DB size is growing too fast.*
```sql
-- Explanation: Deletes rows where 'expires_at' is in the past.
-- We use NOW() converted to Epoch Milliseconds to match our JS timestamp format.
DELETE FROM sessions 
WHERE expires_at < (EXTRACT(EPOCH FROM NOW()) * 1000);
```

**SCRIPT 2: Fraud Detection Audit**
*Use this to spot weird activity patterns.*
```sql
-- Explanation: Finds phone numbers that have created > 50 shipments in 24 hours.
SELECT sender_mobile, COUNT(*) as shipment_count
FROM shipments 
WHERE created_at > NOW() - INTERVAL '24 HOURS' 
GROUP BY sender_mobile 
HAVING COUNT(*) > 50
ORDER BY shipment_count DESC;
```

**SCRIPT 3: Emergency Admin Reset**
*Use this if you get locked out.*
```sql
-- Explanation: Manually updates the admin password hash.
-- NOTE: You must generate a new bcrypt hash manually before running this.
UPDATE users 
SET password_hash = '$2b$12$NEW_HASH_GOES_HERE' 
WHERE username = 'admin';
```

### 5b. Disaster Recovery (DR) Protocols

**Scenario: "The Database was Deleted"**
1.  **Don't Panic.** Supabase takes daily backups.
2.  **Stop Traffic:** Scale your web server down to 0 instances to prevent failed writes.
3.  **Go to Supabase:** Database -> Backups.
4.  **Select Point-In-Time:** Choose a time *before* the deletion occurred.
5.  **Restore:** Click Restore. This may take 20 minutes.
6.  **Resume:** Scale web server back up.

**Scenario: "API Keys Leaked on GitHub"**
1.  **Revoke:** Go to Supabase -> Settings -> API. Click "Rotate Secret".
2.  **Update Config:** This will generate a new `ANON_KEY` and `SERVICE_KEY`. You must update these in your hosting platform's Environment Variables immediately.
3.  **Redeploy:** Restart the application to load the new keys.

---

## Section 6: Troubleshooting Guide (Decision Tree)

**Issue: User sees "Connection Refused"**
1.  Is the Database URL correct in `.env`?
    *   **No:** Fix it.
    *   **Yes:** Check Supabase status. Is the project paused?
        *   **Yes:** Log in to wake it up.
        *   **No:** Contact Support.

**Issue: "Session Invalid" Loop**
1.  Are cookies being set in the browser?
    *   **No:** Check `SESSION_SECURE`. If testing on HTTP (Localhost), this must be `false`. If HTTPS (Prod), it must be `true`.
    *   **Yes:** Check Server Logs. Is the server time synced? Auth tokens rely on time windows.

**Issue: "CORS Error" / Blocked Request**
1.  Check the `Origin` header in the failing request (DevTools -> Network).
2.  Does it match `FRONTEND_URL` *exactly*?
    *   **No:** Update `FRONTEND_URL`. Note that `https://myapp.com` is different from `https://myapp.com/` (trailing slash).

---

<div align="center">
  <p><strong>MoveX Enterprise Operations Manual</strong></p>
  <p>Property of MoveX Logistics. Do not distribute publicly.</p>
</div>
