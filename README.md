# 🚚 MoveX - Enterprise Logistics Management Platform

<div align="center">
  <img src="./logo-images/logo3.png" alt="MoveX Logo" width="120" style="margin-bottom: 20px;">
  <h3>A modern, secure, and hyper-scalable logistics and courier management system.</h3>
  <p>Engineered for performance with Node.js, Express, PostgreSQL, and High-Performance Vanilla JavaScript.</p>
</div>

---

## 📖 Introduction

**MoveX** is a comprehensive logistics orchestration platform designed to handle complex supply chain operations. From sequential tracking ID generation and real-time shipment status updates to organization-wide user management and role-based access control (RBAC), MoveX provides the digital backbone for modern courier services.

The platform is designed with a **Security-First** philosophy, ensuring that sensitive shipment data and user information are protected by industry-standard cryptographic practices.

---

## 🏛️ System Architecture

MoveX follows a decoupled architecture ensuring high availability and independent scalability of the frontend and backend layers.

### 1. Frontend Layer (Static & Ultra-Fast)
- **Host:** Cloudflare Pages
- **Stack:** HTML5, CSS3, Vanilla ES6+ JavaScript.
- **Key Features:** Anti-FOUC (Flash of Unauthenticated Content) protection, dynamic dashboard rendering, and client-side encryption vault for offline data protection.

### 2. Backend API Layer (Secure & Scalable)
- **Host:** Koyeb (Production)
- **Stack:** Node.js, Express.js.
- **Logic:** Centralized authentication, shipment lifecycle management, and administrative orchestration.
- **Security:** Strict CORS, CSP headers, HttpOnly sessions, and rate-limiting.

### 3. Data Persistence Layer (Reliable)
- **Host:** Supabase (PostgreSQL)
- **Logic:** Relational schema with indexed tracking IDs, session persistence, and organization-based isolation.

---

## 🚀 Key Features

### 📦 Shipment Management
- **Sequential Tracking IDs:** Smart generation (e.g., `MX00001`, `MX00002`) with pattern recognition logic.
- **Lifecycle Tracking:** Real-time status transitions (`Pending` → `In Transit` → `Delivered`).
- **Detailed Timeline:** Visual representation of every milestone in a shipment's journey.
- **Estimations:** Algorithmic delivery date estimation based on route and service type.

### 👥 User & Org Management
- **Role Hierarchy:** Strict RBAC enforcing permissions for `Admin`, `Franchisee`, `Staff`, and `User`.
- **Admin Dashboard:** Centralized control plane for managing users, monitoring stats, and handling bookings.
- **Session Control:** Admins can remotely disable accounts and terminate active sessions instantly.
- **MFA Ready:** Multi-Factor Authentication bridge integrated for high-security accounts.

### 🛡️ Administrative Control Gear
- **Maintenance Mode:** Instant global toggle to protect the site during updates without redeploying.
- **Stats & Reporting:** Real-time KPI injection (Revenue, Success Rate, Daily Volume).
- **Serviceability Engine:** Quick-check tool for route availability between 100+ major Indian cities.

---

## 🔐 Security Deep-Dive

Security is not a feature in MoveX; it is the foundation.

- **Authentication:** Dual-layer auth using **DB-backed Sessions** (primary) and **JWT** (fallback for cross-origin compliance).
- **Password Strength:** Enforced minimum lengths and **Bcrypt (cost 12)** hashing.
- **Data Integrity:** Client-side **Vault Architecture** using AES-GCM and SHA-256 integrity signatures.
- **Infrastructure Security:** 
  - **HSTS:** Strict Transport Security forced on all production traffic.
  - **CSP:** Content Security Policy restricting script execution to trusted domains only.
  - **DDoS Protection:** Leveraging Cloudflare's edge network for the entry point.
- **Session Hardening:** `HttpOnly`, `SameSite=None/Lax`, and `Secure` attributes on all sensitive cookies.

---

## 📁 Project Structure

```bash
movex/
├── admin/                  # Specialized Admin Control Panels
│   ├── dashboard.html      # KPI & Main Overview
│   ├── shipments.html      # Global Shipment Ledger
│   └── users.html          # User Orchestration
├── backend/                # API Engine (Node.js)
│   ├── src/
│   │   ├── app.js          # Main Entry & Security Middleware
│   │   ├── session.js      # DB Session Store Logic
│   │   └── controllers/    # Business Logic (Auth, Shipments)
│   ├── routes/             # Endpoint Definitions
│   └── sql/                # DB Schema & Migrations
├── dashboards/             # Role-Specific UI Endpoints
├── js/                     # Frontend Logical Layer
│   ├── admin-core.js       # Admin UI Orchestration
│   ├── auth-api.js         # Unified Auth Interactor
│   └── security/           # Client-side Crypto & Vault
├── styles/                 # Design System (Vanilla CSS)
└── index.html              # Gateway (Landing + Auth Card)
```

---

## 🛠️ Local Development Setup

### Prerequisites
- Node.js (v18+)
- PostgreSQL (or Supabase URL)

### Step 1: Clone & Install
```bash
git clone https://github.com/darshit-lagdhir/MoveX.git
cd MoveX/backend
npm install
```

### Step 2: Environment Configuration
Create a `.env` file in the root directory (parent of `backend/`):
```ini
PORT=4000
DATABASE_URL=your_postgres_url
SESSION_SECRET=min_32_chars_random_secret
JWT_SECRET=min_32_chars_random_secret
FRONTEND_URL=http://localhost:3000
MAINTENANCE_MODE=false
```

### Step 3: Database Migration
Execute the scripts in `backend/sql/` against your PostgreSQL instance to initialize the schema and seed roles.

### Step 4: Run
```bash
npm start
```

---

## 🚢 Deployment Logic

MoveX is optimized for the following production stack:

| Layer | Recommended Provider | Command |
|-------|----------------------|---------|
| **Frontend** | Cloudflare Pages | `npx wrangler deploy` |
| **Backend** | Koyeb / Render | `npm start` (Listen on 0.0.0.0) |
| **Database** | Supabase | Managed PostgreSQL |

**Pro-Tip:** Always verify `FRONTEND_URL` and `MAINTENANCE_MODE` env vars on the backend provider after deployment.

---

## 📖 Extended Documentation

| Document | Content |
|----------|---------|
| [PRODUCTION.md](./PRODUCTION.md) | Infrastructure, SSL, and Scaling |
| [API.md](./API.md) | Endpoint Schemas and Status Codes |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Git workflow and Coding Standards |

---

<div align="center">
  <p>© 2026 MoveX Logistics Platform. All Rights Reserved.</p>
  <strong>Moving the World, One Package at a Time.</strong>
</div>