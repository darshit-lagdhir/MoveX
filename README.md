# 🚚 MoveX - Enterprise Logistics Management Platform

Welcome to **MoveX**, a high-performance, secure, and modern logistics orchestration platform. MoveX is built to solve the complex problems of the courier and supply chain industry, providing a digital backbone for tracking, user management, and administrative control.

---

## 📖 Introduction (The "Why")
In the world of logistics, speed and trust are everything. MoveX was engineered to provide a seamless experience for four main groups:
1. **Customers**: Who need to track their packages in real-time.
2. **Franchisees**: Who run local hubs and manage their own territories.
3. **Staff**: Who handle the day-to-day work of booking and moving packages.
4. **Admins**: Who oversee the entire system, manage users, and monitor stats.

The platform focuses on **Security-First** logic, ensuring that sensitive shipment data and user info are protected by banking-grade encryption and secure session handling.

---

## 🏛️ System Architecture (Coding Sense)

MoveX follows a **Stateless API** design. This means the server doesn't "remember" who you are on its own; it uses secure cookies and database lookups to verify every single click.

### High-Level Stack:
- **Frontend**: Ultra-fast Vanilla JavaScript (ES6+), HTML5, and CSS3. We don't use heavy frameworks like React or Vue, which makes the site load almost instantly.
- **Backend**: Node.js and Express. It acts as the "Brain," handling all the math, security checks, and database talk.
- **Database**: PostgreSQL (via Supabase). This is where every package and user is stored safely.

### 📁 Technical Project Structure
```bash
MoveX/
├── admin/                  # Admin Dashboard HTML files
├── backend/                # The logic server (Node.js)
│   ├── routes/             # URL paths (e.g., /api/auth, /api/dashboard)
│   ├── src/                # Core engine code
│   │   ├── app.js          # Security, Middleware, and Setup
│   │   └── session.js      # Database-backed session logic
│   └── sql/                # Database table blueprints (Migrations)
├── dashboards/             # UI for Staff, Users, and Franchisees
├── js/                     # The "Heartbeat" of the frontend
│   ├── admin-core.js       # Admin UI logic (Modals, Tables)
│   ├── auth-api.js         # Unified login/register logic
│   └── dashboard-guard.js  # Security: Checks if you're allowed to see a page
└── styles/                 # Modern, Glassmorphism-based CSS
```

---

## 📊 Database Structure (The Data Logic)

MoveX uses a relational database. Understanding how the tables talk to each other is key for any developer.

### 1. `users` Table
Stores everyone who can log in. 
- **Fields**: `id`, `username`, `password_hash`, `role` (admin, franchisee, staff, user), `organization_id`.
- **Logic**: Linked to an `organization` for Franchisees and Staff.

### 2. `organizations` Table
Stores the "Hubs" or "Franchises".
- **Fields**: `name`, `type` (franchise, hq), `pincodes` (comma-separated list of covered areas), `non_serviceable_areas`.

### 3. `shipments` Table
The heart of the system.
- **Fields**: `tracking_id` (e.g. MX00001), `sender_name`, `receiver_name`, `status`, `weight`, `price`.
- **Linked Data**: Each shipment has a timeline (audit trail) showing every move it makes.

### 4. `sessions` Table
Used for backend security. It stores current active logins so we can kick out users remotely if needed.

---

## 🚀 Key Features & Functionality

### 📦 Shipment Management & Workflow
- **Creation**: Staff enters details ➡️ Code generates a unique `MX` ID ➡️ Label is ready for printing.
- **Tracking**: Anyone with the ID can see the timeline. No login needed for basic tracking!
- **Serviceability Check**: A special API that takes a Pincode and checks the `organizations` table. It tells the user if we can deliver there and which hub will handle it.

### 👥 Franchise Hub System
- **Hub Creation**: Admins create a Hub (Organization) and an Owner (User) in one step.
- **Performance**: The system tracks hub performance based on delivery speed and volume.
- **Pincode Mapping**: Hubs are assigned specific 6-digit pincodes. This makes the "Check Service" tool smart enough to route packages correctly.

### 🛡️ Admin Dashboard (Command Center)
- **Live Stats**: Uses global `COUNT` and `SUM` queries to show revenue and package volume in real-time.
- **User Management**: Admins can "Reset Password" or "Disable" any user without touching the database directly.

---

## 🛠️ Local Development (Step-by-Step)

### Prerequisites
- Install **Node.js** (Version 18 or higher).
- Install **PostgreSQL** or use a **Supabase** account.

### Step 1: Clone and Install
```bash
git clone https://github.com/darshit-lagdhir/MoveX.git
cd MoveX/backend
npm install
```

### Step 2: Configure Secrets (`.env`)
Create a `.env` file in the `backend` folder.
```ini
NODE_ENV=development
PORT=4000
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT_ID.supabase.co:6543/postgres?sslmode=require
JWT_SECRET=your_jwt_secret_key
SESSION_SECRET=your_session_secret_key
SESSION_MAX_AGE=3600000
SESSION_SECURE=false
SESSION_SAME_SITE=Strict
CSRF_ENABLED=true
OFFLINE_SECURITY_DISABLED=true
LOG_AUTH_ATTEMPTS=true
LOG_LEVEL=info
HEALTH_CHECK_KEY=your_health_check_key
MAINTENANCE_MODE=false
FRONTEND_URL=http://localhost:4000
```

### Step 3: Run the Server
```bash
npm start
# The backend is now watching for requests on port 4000!
```

---

<div align="center">
  <p>© 2026 MoveX Logistics Ecosystem</p>
  <strong>"Moving the world, one package at a time."</strong>
</div>