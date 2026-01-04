# MoveX - Next Generation Logistics Platform

<div align="center">
  <h3>A modern, secure logistics and courier management system</h3>
  <p>Built with Node.js, Express, PostgreSQL, and Vanilla JavaScript</p>
</div>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14+ (local) or Supabase account (cloud)
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/movex.git
cd movex

# Install dependencies
cd backend
npm install

# Configure environment
cp ../.env.example ../.env
# Edit .env with your settings

# Start the server
npm start
```

### Access the Application

- **Main Application:** http://localhost:4000
- **Health Check:** http://localhost:4000/api/health
- **Admin Dashboard:** http://localhost:4000/admin/dashboard.html

---

## 🏢 Project Architecture & Core Logic

MoveX is engineered as a **Privacy-First, Monolithic Logistics Platform**. Unlike traditional JAMstack applications, MoveX tightly couples the frontend and backend to ensure maximum security, zero data leakage, and sub-millisecond latency.

### 1. The "Hybrid SPA" Frontend Engine
We have rejected heavy frameworks like React or Vue in favor of a custom, hyper-optimized **Vanilla JS Router**.

*   **Zero-Build Architecture:** There is no `npm build` step for the frontend. What you see in `admin/*.html` is exactly what the browser renders. This ensures that no "sourcemap" leaks occur in production.
*   **The "Shadow Router" (`js/admin-layout.js`):**
    *   This script acts as the application's layout manager. It intercepts all sidebar clicks.
    *   Instead of reloading the page, it fetches the target HTML file (e.g., `shipments.html`), strips out the `<head>` and metadata, and injects *only* the body content into the main view container.
    *   **Result:** The user experiences the speed of a Single Page App (SPA) while maintaining the simplicity of static files.
*   **State Persistence:** The `Sidebar`, `Header`, and `AudioContext` (for notification sounds) never reload. They persist for the entire session.

### 2. The "Iron Fortress" Backend
The backend (`backend/src/app.js`) is configured as a strict security gatekeeper. It does not just "serve data"; it aggressively validates every packet.

*   **Static Firewall (`protectStaticDashboards`):**
    *   Most apps serve HTML files publicly. MoveX does **not**.
    *   We use a custom middleware that intercepts requests for *any* `.html` file.
    *   The server checks the PostgreSQL database for a valid, non-expired session token.
    *   If the session is missing or invalid, the request is rejected with `401 Unauthorized` *before* the file system is even touched.
*   **Session "Air-Gap":**
    *   We do not use JWTs (JSON Web Tokens) for session management, as they cannot be instantly revoked.
    *   Instead, we use **Opaque Tokens** stored in the `sessions` table.
    *   This allows admins to "Remote Kill" a session instantly if a device is stolen, a feature impossible with standard JWTs.

---

## 📁 Critical Directory Structure

Understanding the codebase layout is essential for maintenance.

### `/admin` vs `/dashboards`
*   **`admin/`**: Contains high-privilege views (User Management, Global Analytics, System Config). These pages are physically separated to allow for stricter file-level permission auditing.
*   **`dashboards/`**: Contains the specific landing pages for `Franchisee`, `Staff`, and `User` roles. These are optimized for mobile views and low-bandwidth functionality.

### `/backend/src/session.js`
This is the heart of the authentication system. It implements a **Sliding Window Session Engine**:
*   **Auto-Renewal:** Every time a user interacts with the app, their session expiry is extended by 1 hour.
*   **Garbage Collection:** A background process runs every 15 minutes to physically delete expired rows from the database, preventing "zombie sessions".

### `/js/security/`
*   Contains the **Active Defense Modules**.
*   **`anti-tamper.js`**: Monitors the browser's viewport and console status. If it detects a debugger or DevTools, it triggers a "System Lockdown" UI.
*   **`device-binding.js`**: Fingerprints the user's hardware. If a session cookie is copied to a different machine, the server rejects it because the fingerprint hash mismatches.

---

## 🔐 Role-Based Access Control (RBAC) Matrix

MoveX enforces permissions at both the **Route Level** (Backend) and **View Level** (Frontend).

| User Role | Dashboard Access | Write Permissions | Sensitive Data Visibility |
| :--- | :--- | :--- | :--- |
| **System Admin** | Full System Control | ✅ Create/Delete Users, Franchises | ✅ Full Visibility (Financials, Logs) |
| **Franchisee** | Local Branch Only | ✅ Create Shipments, Manage Staff | ⚠️ Limited to own branch revenue |
| **Staff Member** | Operational View | ✅ Update Shipment Status | ❌ Cannot view financials or delete data |
| **End User** | Personal Portal | ❌ Read-Only (Own History) | ❌ Own data only |

---

## 🛠️ Configuration & Environment

The application relies on a strict set of Environment Variables to function. These are loaded from `.env` at startup.

### Core Identity
*   **`NODE_ENV`**: Controls security strictness. Set to `production` to enable HSTS and Secure Cookies.
*   **`PORT`**: The internal port the listener binds to (Default: `4000`).

### Database & Security
*   **`DATABASE_URL`**: The connection string for the PostgreSQL instance. 
    *   *Note:* Must include `?sslmode=require` for cloud databases like Supabase.
*   **`SESSION_SECRET`**: A 32+ character random string used to sign the HttpOnly cookies. **If changed, all current users will be logged out.**
*   **`HEALTH_CHECK_KEY`**: A private key used by uptime monitors to verify the `/api/health` endpoint without exposing system details publicly.

---

## 🔧 Troubleshooting & Operations

### diagnosing "White Screen" Issues
If a user reports a blank screen upon login:
1.  **Check Session State:** The likely cause is an expired session token that the browser hasn't cleared. Direct them to `/api/auth/logout`.
2.  **Verify Database:** Check if the PostgreSQL service is paused (common with free-tier cloud providers).
3.  **Check Time Sync:** Since we use strict timestamps, if the server time drifts by >5 minutes, authentication will fail.

### Handling "Connection Refused"
1.  **Whitelist IP:** If using a cloud database, ensure the server's IP is allowed in the firewall.
2.  **SSL Configuration:** Ensure `DB_SSL=true` is set in the environment variables if the database enforces SSL connections.

---

## 📦 Data Management

### Shipment Life-Cycle
1.  **Pending:** Created but not yet processed.
2.  **In Transit:** Picked up and moving through the network.
3.  **Out for Delivery:** Assign to a last-mile runner.
4.  **Delivered:** Confirmed with Proof-of-Delivery.
5.  **Exception:** Address inaccurate or refused.

### Photo Proof-of-Delivery
*   Photos are **never** public.
*   They are stored in a private bucket (`shipment-photos`).
*   The backend generates a **Signed URL** (valid for 60 minutes) only when a legitimate user requests to view a specific tracking ID.

---

## 📜 License & Proprietary Notice

**MoveX Enterprise Edition**
Copyright © 2024-2026. All Rights Reserved.
Unauthorised copying, modification, distribution, or use of this software without prior written consent is strictly prohibited.

