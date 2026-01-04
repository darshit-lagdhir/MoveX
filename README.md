# 🚚 MoveX
**Enterprise Logistics Orchestration Platform**

> **Version:** 2.4.1 (Stable)
> **Stack:** Node.js • Cloudflare Pages • Supabase (PostgreSQL)

---

## ⚡ Executive Summary

**The Problem**
Traditional logistics systems are fragmented:
*   ❌ **Franchises** run on disconnected Excel sheets.
*   ❌ **Head Office** lacks real-time revenue visibility.
*   ❌ **Customers** suffer from vague "Out for Delivery" statuses.

**The MoveX Solution**
We unify the supply chain into a single **Real-Time Source of Truth**:
*   👑 **Global Admin:** "God Mode" dashboard (`admin/dashboard.html`) for total control.
*   🏢 **Franchise Hubs:** Dedicated portal (`dashboards/franchisee.html`) for territory management.
*   📦 **End Users:** Lightning-fast tracking (`index.html`) – No login required.

---

## 🏛️ System Architecture

We use a **Hybrid Architecture** to balance performance and security.

### 🎨 Frontend: The "Hybrid SPA"
*   **Engine:** Vanilla JS (ES6+) – *No Frameworks, No Build Step.*
*   **Router (`js/admin-layout.js`):**
    *   Intercepts clicks on `<a>` tags.
    *   Fetches `.html` content via AJAX.
    *   Injects into the DOM (preserving Sidebar/Header).
*   **Performance:** 99/100 Lighthouse Score.

### 🛡️ Backend: The "Iron Fortress"
*   **Core:** Node.js v18 + Express.js.
*   **Firewall (`protectStaticDashboards`):**
    *   Intercepts **ALL** requests to `*.html`.
    *   **Rule:** No Session ID = No HTML served.
    *   *Result:* Attackers cannot even see the page layout.
*   **Security Stack:**
    *   `helmet`: Strict Content-Security-Policy.
    *   `rateLimiter`: Stops brute-force (5 tries/15m).
    *   `csrf`: Double-Submit Cookies.

### 🔐 Session Store: " The Vault"
*   **Type:** Database-Backed (PostgreSQL).
*   **File:** `backend/src/session.js`
*   **Flow:**
    1.  **Login:** server generates 32-byte Hex Token.
    2.  **Store:** Saved in DB with IP + Role.
    3.  **Auto-Cleanup:** Background job deletes expired rows every **15 mins**.

---

## ⚔️ Security Infrastructure (Defense-in-Depth)

We assume the client is compromised. We verify **everything**.

### 💻 Client-Side Defense
*(Located in `js/security/`)*

*   👀 **Anti-Tamper:**
    *   Detects DevTools (`F12` / `Ctrl+Shift+I`).
    *   **Trigger:** Instant "Red Screen" Lockdown.
*   👆 **Device Binding:**
    *   Fingerprints Screen Res + WebGL + Fonts.
    *   Prevents Session Hijacking.
*   🔒 **Vault Manager:**
    *   Encrypts `localStorage` data using **AES-GCM**.

### ☁️ Server-Side Defense
*(Located in `backend/middleware/`)*

*   **Validation:**
    *   **Usernames:** Alphanumeric only.
    *   **Phone:** strict Indian Regex (`/^[6-9]\d{9}$/`).
    *   **Size:** Drop payloads > 100KB.
*   **Privacy Logging:**
    *   Logs failures but **masks** emails (`a***@gmail.com`).

---

## 💾 Database Logic

**Engine:** PostgreSQL (Supabase)
**Key Features:** `Enums`, `Cascading Deletes`, `RLS`.

| Table | Role | Key Logic |
| :--- | :--- | :--- |
| `users` | Identity | Linked to Org. Deleted if Org is deleted. |
| `organizations` | Business Unit | `type` ('hq', 'franchise'). usage of `pincodes` string for filtering. |
| `shipments` | Transactions | Sequential IDs (`MX00050`). `sender_` & `receiver_` pincodes. |
| `sessions` | Security | Ephemeral. Rows created on Login, destroyed on Logout. |

---

## 🛠️ Installation & Setup

**Prerequisites:** Node.js v18+ • PostgreSQL • Git.

### 1️⃣ Setup Backend
```bash
git clone https://github.com/darshit-lagdhir/MoveX.git
cd MoveX/backend
npm install
```

### 2️⃣ Configure Environment
Create `.env` (Use `.env.example`):
```env
PORT=4000
DATABASE_URL="postgres://..."
SESSION_SECRET="LONG_RANDOM_STRING"
NODE_ENV="development"
```

### 3️⃣ Migrate Database
Run SQL files in `backend/sql/` manually:
1.  `001_init_users.sql` (Tables)
2.  `011_create_shipments.sql` (Logic)
3.  `017_franchise_updates.sql` (Patches)

### 4️⃣ Launch
```bash
npm start
```
*   **App:** `http://localhost:4000`

---

## 🗂️ Documentation Map

| File | Purpose | Audience |
| :--- | :--- | :--- |
| **[API.md](./API.md)** | Endpoints, JSON Schemas, Error Codes | Frontend Devs, Testers |
| **[PRODUCTION.md](./PRODUCTION.md)** | Deployment, Env Vars, Incident Response | DevOps, SREs |
| **[CONTRIBUTING.md](./CONTRIBUTING.md)** | Coding Standards, Folder Map, Git Flow | Developers |

---

<div align="center">
  <sub>MoveX Enterprise • Built for Speed • Secured by Design</sub>
</div>