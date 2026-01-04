# 🛠️ MoveX Production Operations Guide

This guide is for the administrators and engineers responsible for keeping MoveX running 24/7. It describes our hosting stack, security measures, and what to do when things go wrong.

---

## 🏗️ The Infrastructure Stack

MoveX uses a **Triple-Layer Strategy** for maximum speed and security:

1. **Frontend (The Face)**: Hosted on **Cloudflare Pages**. 
   - **Performance Sense**: Cloudflare serves files from the "Edge". If a user is in Mumbai, they get data from a Mumbai server, not a US server.
2. **Backend (The Brain)**: Hosted on **Koyeb**.
   - **Coding Sense**: Koyeb handles our Node.js runtime and automatically restarts the app if it crashes.
3. **Database (The Memory)**: Hosted on **Supabase (PostgreSQL)**.

---

## 🔒 Session Security (Important for Devs)

In production, cookies must be very secure. We use these settings:
- **`SESSION_SECURE=true`**: This means cookies only work over HTTPS. If you use a non-secure site, your login will fail.
- **`SESSION_SAME_SITE=None`**: This allows the Cloudflare Frontend to talk to the Koyeb Backend across different domains. Without this, you can't log in!

---

## 📂 Production Environment Variables (Secrets)

These are stored in your hosting dashboard (Koyeb), NOT in the code.

| Key | Description (Coding) | Why it matters (Non-Coding) |
| :--- | :--- | :--- |
| `NODE_ENV` | Must be `production`. | Stops the app from showing internal code errors. |
| `DATABASE_URL` | Pooled connection string. | Handles more users without crashing. |
| `JWT_SECRET` | 64+ character random hex. | Secures user login tokens. |
| `SESSION_SECRET` | 64+ character random hex. | Secures browser session cookies. |
| `SESSION_MAX_AGE` | Milliseconds (e.g. 3600000). | Controls how long a user stays logged in. |
| `SESSION_SECURE` | Must be `true` in production. | Ensures login only works over HTTPS. |
| `SESSION_SAME_SITE` | Must be `None` for cross-origin. | Allows different domains to share sessions. |
| `MAINTENANCE_MODE` | Global boolean toggle (`true`/`false`). | Locks the site during updates. |
| `FRONTEND_URL` | Whitelist for CORS security. | Only your official site can talk to the API. |
| `HEALTH_CHECK_KEY` | Secret monitoring key. | Protects system health data. |

---

## 🚢 Operational Protocols

### 1. Activating Maintenance Mode
If you need to fix the database or update the UI:
1. Go to Koyeb settings ➡️ Change `MAINTENANCE_MODE` to `true`.
2. **Coding Logic**: The `app.js` middleware will intercept every request. If you are NOT an admin, it will redirect you to the `/maintenance` page.
3. Admins can still log in to fix things!

### 2. Post-Deployment Verification (Checklist)
After every push, do this:
- [ ] Check `https://api.yourdomain.com/api/health`. It should say `status: UP`.
- [ ] Log in as an Admin and check if the "Revenue" stats load.
- [ ] Open a "Shipment Details" modal and try to print a label.
- [ ] Check the browser console. If there are red "CORS" errors, your `FRONTEND_URL` is wrong.

---

## 🆘 Troubleshooting

### "Login works on local but fails on live site"
- **Cause**: Cross-origin security.
- **Fix**: Verify your `FRONTEND_URL` env var matches exactly (check `https://` vs `http://`). Also ensure `SESSION_SECURE` is `true`.

### "Changes in HTML are not showing"
- **Cause**: Cloudflare caching.
- **Fix**: Trigger a "Purge Cache" in the Cloudflare dashboard or wait 5 minutes.

---

<div align="center">
  <sub>MoveX Operational Integrity System - Version 2.1.0</sub>
</div>
