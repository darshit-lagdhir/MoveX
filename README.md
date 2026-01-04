# 🚚 MoveX - Enterprise Logistics Orchestration Platform

> **Version:** 2.4.1 (Stable, Production Ready)  
> **Architecture:** Hybrid Single Page Application (SPA) + Node.js Monolith  
> **Security Standard:** Financial-Grade Defense-in-Depth (Client + Server + Database)  
> **Deployment Strategy:** Cloudflare Pages (Frontend) + Koyeb Serverless (Backend) + Supabase (PostgreSQL)

---

## 📖 1. Executive Summary (The "Why")

**MoveX** is not just a courier tracking script; it is a complete **Logistics Operating System**. It was built to solve the fragmentation problem in modern supply chains where "Head Office," "Franchise Hubs," and "End Customers" often live in disconnected data silos.

### The Problem it Solves
In traditional systems:
*   Franchises run on Excel sheets, leading to data loss and lack of synchronization with the central database.
*   Head Office has no real-time visibility on revenue, relying on end-of-day reports that are often inaccurate.
*   Customers only see "Out for Delivery" with no granular tracking or live status updates.
*   Security is often an afterthought, with weak passwords and no protection against direct database tampering or session hijacking.

### The MoveX Solution
MoveX unifies these worlds into a single, real-time "Source of Truth."
*   **For Admins:** A "God Mode" dashboard (`admin/dashboard.html`) that aggregates finances, performance, user access, and global shipment volume in real-time. Admin can lock down the system instantly.
*   **For Franchises:** A dedicated portal (`dashboards/franchisee.html`) to manage their specific territory, pincodes, staff, and bookings.
*   **For Customers:** A lightning-fast, public facing tracking page (`index.html`) that requires no login and provides instant gratification.

---

## 🏛️ 2. System Architecture (Technical Deep Dive)

We utilize a "No-Framework" approach for the Frontend to ensure maximum performance (99/100 Lighthouse Score) and zero build-step complexity, while the Backend is a robust Node.js fortress.

### A. Frontend Layer: The "Hybrid SPA" Engine
Unlike typical React/Vue apps that send a massive JavaScript bundle, MoveX uses a custom **Lightweight Router**.

*   **Router Logic (`js/admin-layout.js`)**: This script intercepts all navigation clicks. Instead of reloading the page, it fetches the target `.html` file (e.g., `users.html`), strips the `<html>` and `<body>` tags, and injects **only the main content** into the current view. This preserves the sidebar and header state.
*   **Dynamic Injection**: The Sidebar (`partials/admin-sidebar.html`) and Header (`partials/admin-header.html`) are loaded *once* and cached. They never reload, giving the user an "app-like" feel without the overhead of a Virtual DOM.
*   **The Controller (`js/admin-core.js`)**: This massive 2000+ line file acts as the "Brain." It:
    *   Initializes data tables and skeletons.
    *   Handles Modal popups via `window.MoveXAdmin.modal` (a custom factory).
    *   Manages API communication for every single admin page.
    *   Coordinates the "Serviceability Checker" logic.

### B. Backend Layer: The "Iron Fortress" (`backend/src/app.js`)
*   **Runtime**: Node.js v18+ with Express.js (Fast, unopinionated).
*   **Static Protection Middleware**: We implemented a custom firewall called `protectStaticDashboards`. It intercepts every request to `*.html`. If the user does not have a valid, active session in the database, the server **refuses to serve the HTML file entirely**. This prevents attackers from even seeing the layout of your admin panel by guessing URLs.
*   **Security Stack**:
    *   `helmet` (via `securityHeaders.js`): Sets strict Content-Security-Policy to block XSS.
    *   `rateLimiter.js`: Limits login attempts to 5 per 15 minutes to stop brute-force attacks.
    *   `csrf.js`: Implements "Double-Submit Cookie" protection to prevent Cross-Site Request Forgery.
    *   `authLogging.js`: Logs all auth events but masks PII.

### C. The "Vault" Session Store (`backend/src/session.js`)
We do not use default memory sessions or simple JWTs. We built a custom **Database-Backed Session Store**.
1.  **Login**: Generates a random 32-byte hex token using `crypto.randomBytes`.
2.  **Storage**: Saves the token + User Role + IP + Expiry in the PostgreSQL `sessions` table.
3.  **Sliding Window**: Every time a user makes a request, their session expiry is extended automatically, preventing annoyance while keeping idle users safe.
4.  **Auto-Cleanup**: A background "Garbage Collector" runs every 15 minutes to permanently delete expired sessions from the database, ensuring no "zombie sessions" exist.

---

## 🎨 3. Design & UX Philosophy

We believe Enterprise software should not look boring. MoveX uses a custom Design System.

### Glassmorphism & Visuals (`css/admin.css`)
*   **Glass Cards**: We use `backup-filter: blur(10px)` with semi-transparent white backgrounds to create depth.
*   **Gradients**: The brand "Primary" uses a dynamic linear gradient (`#4f46e5` to `#7c3aed`), indicating movement and speed.
*   **Typography**: We use `Inter` and `Outfit` (Google Fonts) for high readability at small sizes (tables) and impact at large sizes (headings).

### Micro-Interactions
*   **Hover Effects**: Every button lifts (`transform: translateY(-2px)`) on hover.
*   **Toast Notifications**: Success/Error messages slide in from the top-right (`js/admin-core.js` -> `showToast`).
*   **Skeletons**: While data loads, we show pulsating "Shimmer" skeletons instead of spinners, making the app feel faster.

---

## 🔐 4. Security Infrastructure (Hidden Layer)

MoveX employs a **Defense-in-Depth** strategy. We assume the client is compromised, so we verify everything on the server.

### Client-Side "Active Defense" (`js/security/`)
These modules run in the user's browser to deter tampering:
*   **`anti-tamper.js`**: Monitors the browser's DevTools. If it detects `F12`, `Ctrl+Shift+I`, or a change in viewport size consistent with the Inspector opening, it triggers a **"System Lockdown"** screen (Red flashing background), forcing the user to refresh.
*   **`device-binding.js`**: Generates a unique "Fingerprint" based on the user's screen resolution, graphics card renderer (WebGL), and installed fonts. This ensures a session stolen from one computer cannot be easily used on another.
*   **`vault-manager.js`**: A wrapper for `localStorage` that encrypts sensitive data (like draft shipments) using AES-GCM before saving it to the browser storage.

### Server-Side "Hard Validation" (`backend/middleware/`)
*   **`validation.js`**: A strict gatekeeper. It checks every incoming request body.
    *   **Usernames**: Must accept alphanumeric only (regex `[a-zA-Z0-9]`).
    *   **Phone Numbers**: Must match Indian Mobile Regex (`/^[6-9]\d{9}$/`).
    *   **Payload Size**: Rejects any JSON larger than 100KB to prevent memory crash attacks.
*   **`authLogging.js`**: Privacy-First Logging. It logs every failed login attempt but **masks** the email (e.g., `a***@gmail.com`) and IP address, ensuring we comply with privacy laws (GDPR) while still allowing security auditing.

### Database Layer Security
*   **Row Level Security (RLS)**: Enabled on `sessions` and `shipments` tables. Users can only query rows that belong to their `organization_id`.
*   **Parameterized Queries**: All SQL is written using `$1, $2` syntax to make SQL Injection mathematically impossible.

---

## 💾 5. Database Schema & Data Logic

The database is designed for referential integrity. We use PostgreSQL features like `Enums`, `Foreign Keys`, and `Cascading Deletes`.

### Core Tables
1.  **`users`**: The Identity Table.
    *   **Key Fields**: `id`, `username` (Unique), `password_hash` (Bcrypt Cost 12), `role` (`admin`, `franchisee`, `staff`, `user`).
    *   **Logic**: A user can belong to an Organization via `organization_id`. When an Org is deleted, its users are cascaded (deleted).

2.  **`organizations`**: The Business Units.
    *   **Key Fields**: `id`, `name`, `type` (`hq` or `franchise`), `pincodes` (Text).
    *   **Logic**: "Pincodes" is a comma-separated string (e.g., "400001, 400002") determining which franchise handles a delivery. This allows for simple text-based searching without complex join tables.

3.  **`shipments`**: The Core Transaction.
    *   **Key Fields**: `tracking_id` (Custom 'MX' Series), `status`, `sender_pincode`, `receiver_pincode`.
    *   **State Machine**: `pending` -> `in_transit` -> `delivered` (or `returned`/`failed`).
    *   **Logic**: `tracking_id` is generated sequentially (`MX00001`, `MX00002`) by finding the max existing ID and incrementing it.

4.  **`sessions`**: The Security Heartbeat.
    *   **Key Fields**: `token` (PK), `expires_at`.
    *   **Logic**: This table is ephemeral. Rows are created on login and destroyed on logout/timeout.

---

## 🛠️ 6. Installation & Local Development

Follow this strict sequence to set up the environment completely.

### Prerequisites
*   **Node.js**: Version 18.x or higher (Required for `crypto` module).
*   **PostgreSQL**: A live database (Supabase recommended for vectors/RLS support).
*   **Git**: For version control.
*   **Postman/Insomnia**: For API testing (optional).

### Step-by-Step Setup
1.  **Clone the Repository**
    ```bash
    git clone https://github.com/darshit-lagdhir/MoveX.git
    cd MoveX/backend
    ```

2.  **Install Dependencies**
    We use `npm` for package management.
    ```bash
    npm install
    # Installs: express, pg, bcrypt, cors, dotenv, helmet, jsonwebtoken...
    ```

3.  **Environment Configuration**
    Create a `.env` file in the `backend/` root. Use the provided `.env.example` as a template.
    ```env
    PORT=4000
    DATABASE_URL="postgres://user:pass@host:5432/db?sslmode=require"
    SESSION_SECRET="...generate_a_long_random_string_here..."
    NODE_ENV="development" 
    # Set NODE_ENV="production" ONLY when deploying to Koyeb.
    ```

4.  **Database Migration (Critical)**
    Manually run the SQL files in `backend/sql/` using a tool like pgAdmin or the Supabase SQL Editor.
    *   Run `001_init_users.sql` FIRST (Creates tables).
    *   Run `011_create_shipments.sql` (Creates shipment logic).
    *   Run `017_franchise_updates.sql` LAST (Applies patches).

5.  **Launch the System**
    ```bash
    npm start
    ```
    *   **Server**: Running on `http://localhost:4000`.
    *   **Frontend**: Accessible via `http://localhost:4000/index.html`.
    *   **Default Login**: You may need to manually insert a user into the DB if none exists.

---

## �️ 7. Directory Structure (The Map)

For new developers, here is where everything lives:

```
/
├── admin/              # Admin HTML Pages (Dashboard, Users, Shipment)
├── backend/            # The Node.js Monolith
│   ├── middleware/     # Auth, Validation, Rate Limits
│   ├── routes/         # Express Route Controllers
│   ├── sql/            # Database Migrations (Source of Truth)
│   ├── src/            # Core logic (App entry, Session Store)
│   └── tests/          # Unit tests (Jest)
├── css/                # Global Styles & Admin Themes
├── js/                 # Client-Side Logic
│   ├── security/       # Anti-Tamper & Crypto modules
│   ├── admin-core.js   # Main Controller
│   └── admin-layout.js # SPA Router
├── partials/           # HTML Snippets (Sidebar, Header)
└── README.md           # You are here
```

---

## �📚 8. Documentation Ecosystem

We have split the documentation into four specialized files to keep things organized.

*   **[📡 API Reference (API.md)](./API.md)**:
    *   *For Frontend Devs*: Lists every single endpoint, the JSON it expects, and the JSON it returns.
    *   *For Testers*: Explains Error Codes (401 vs 403) and Rate Limits.
    *   *For Integrators*: Explains the Authentication Handshake.

*   **[🚀 Production Guide (PRODUCTION.md)](./PRODUCTION.md)**:
    *   *For DevOps*: How to deploy to Koyeb, how to configure Cloudflare, and how to monitor the system health.
    *   *For Security Teams*: How to handle an incident (e.g., "Session Hijacking") and rotate keys.

*   **[🤝 Contributor's Handbook (CONTRIBUTING.md)](./CONTRIBUTING.md)**:
    *   *For New Joiners*: Explains the folder structure, Coding Standards (Variables, Functions), and how to add a new Admin Page properly.
    *   *For Managers*: Explains the Git Workflow and Branching Strategy.

---

<div align="center">
  <sub>MoveX Enterprise Documentation - "The Source of Truth"</sub>
</div>