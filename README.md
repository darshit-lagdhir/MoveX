# MoveX - Next Generation Logistics Platform


<div align="center">
  <h3>A modern, secure logistics and courier management system</h3>
  <p><strong>Version:</strong> 2.5.0 (Enterprise Edition)</p>
  <p>Built with Node.js, Express, PostgreSQL, and Vanilla JavaScript</p>
</div>

---

## ⚡ Quick Start & Installation

Get MoveX running locally in less than 5 minutes.

### 1. Prerequisites
Ensure you have the following installed on your machine:
- **Node.js** (v18.0.0 or higher) - Required for modern crypto libraries.
- **PostgreSQL** (v14+) - Or a cloud provider like Supabase/Neon.
- **Git** - For version control.
- **npm** or **yarn** - Package manager.

### 2. Clone & Install
```bash
# Clone the repository to your local machine
git clone https://github.com/your-username/movex.git

# Navigate to the backend directory
cd movex/backend

# Install production dependencies (removes dev-tools for cleaner install)
npm install --omit=dev
```

### 3. Environment Configuration
MoveX requires specific environment variables to function.
```bash
# Copy the template file
cp ../.env.example ../.env
```
**Critical .env Settings:**
- `SESSION_SECRET`: Must be a long, random string (32+ chars).
- `DATABASE_URL`: Your PostgreSQL connection string.
- `FRONTEND_URL`: The URL where your frontend is hosted (e.g., `http://localhost:4000`).

### 4. Database Setup
You must run the SQL migrations in a specific order to set up the schema.
1.  **Connect** to your database (using pgAdmin or `psql`).
2.  **Run** `/backend/sql/001_init_users.sql` - Creates `users`, `organizations`, `password_resets`.
3.  **Run** `/backend/sql/011_create_shipments.sql` - Creates `shipments` table.
4.  **Run** `/backend/sql/017_franchise_updates.sql` - Applies latest patches.

### 5. Launch
```bash
# Start the production server
npm start
```
- **App URL:** `http://localhost:4000`
- **API Health:** `http://localhost:4000/api/health`

---

## 🧠 System Architecture Overview

MoveX adopts a **Monolithic, Privacy-First Architecture** optimized for speed and data sovereignty.

### The "Hybrid SPA" Frontend Engine
Unlike typical React/Vue apps that require heavy bundles, MoveX uses a **Zero-Build** approach.

*   **Router (`js/admin-layout.js`):**
    *   Intercepts global `click` events on `<a>` tags.
    *   Prevents default browser navigation.
    *   Fetches the target HTML via `fetch('/path/to/page.html')`.
    *   Parses the text into a DOM object.
    *   Extracts the content inside `<main id="app-content">`.
    *   Replaces the current main content with the new content.
    *   **Result:** The Sidebar, Header, and Audio Context persist. Transitions are instant (0ms latency).

*   **Controller (`js/admin-core.js`):**
    *   Acts as the central "Brain".
    *   Observes URL changes (pushState).
    *   Triggers specific initializers (e.g., `initShipmentTable()`) when a page loads.
    *   Manages memory cleanup to prevent leaks.

### The "Iron Fortress" Backend
The backend is a hardened Node.js Express server.
-   **Strict Content Security Policy (CSP):** We block all external scripts except trusted CDNs (JsBarcode, Google Fonts).
-   **No-Cache Dashboard:** HTML files for the dashboard are served with `Cache-Control: no-store` to prevent lingering data on public computers.
-   **Session Guard:** The `protectStaticDashboards` middleware acts as a firewall. It checks every request for `.html` files. If the user is unauthenticated, the request is rejected *before* the file is read from disk.

---

## 🔐 User Roles & Permissions

MoveX implements Role-Based Access Control (RBAC).

| Role | Access Level | Dashboard URL | Capabilities |
| :--- | :--- | :--- | :--- |
| **Admin** | **Superuser** | `/admin/dashboard.html` | Create/Delete users, View all shipments, Manage Franchisees, System Config. |
| **Franchisee** | **High** | `/dashboards/franchisee.html` | Create Shipments, Manage Staff, View Financials for specific branch. |
| **Staff** | **Medium** | `/dashboards/staff.html` | Process Shipments, Update Tracking Status, Print Labels. |
| **User** | **Low** | `/dashboards/user.html` | View personal shipments, Profile management. |
| **Customer** | **Public** | `/index.html` | Track shipment only (Read-Only). |

---

## 📁 Detailed Project Structure

```text
movex/
├── .env.example              # Template for environment variables
├── index.html                # Public Landing Page & Login Portal
├── admin/                    # ADMIN-ONLY frontend files
│   ├── dashboard.html        # Main analytics view
│   ├── shipments.html        # Data table for shipments
│   └── print_label.html      # Specialized printable view
├── backend/                  # SERVER-SIDE Code
│   ├── src/
│   │   ├── app.js            # Main Application Entry Point
│   │   ├── session.js        # Custom DB-Backed Session Store
│   │   ├── controllers/      # Business Logic (Auth, Shipments)
│   │   └── config/           # Database Connection Pools
│   ├── middleware/           # Security Interceptors
│   │   ├── auth.middleware.js # Checks Login State
│   │   ├── rateLimit.js      # Anti-DDoS Rules
│   │   └── validation.js     # Input Sanitization
│   └── sql/                  # Database Schema Definitions
├── dashboards/               # ROLE-SPECIFIC frontend files
│   ├── franchisee.html       # Franchisee view
│   └── staff.html            # Staff operational view
├── js/                       # CLIENT-SIDE Logic
│   ├── admin-layout.js       # The SPA Router
│   ├── admin-core.js         # The Page Controller
│   ├── auth-api.js           # AJAX Wrappers for Auth
│   └── utils.js              # Formatters (Date, Currency)
└── styles/                   # CSS
    ├── index.css             # Global Variables & Reset
    └── admin.css             # Dashboard Specific Styles
```

---

## 📡 Comprehensive API Reference

The API follows REST principles. All Admin/Protected endpoints require the `movex.sid` cookie.

### 1. Authentication (`/api/auth`)

#### `POST /login`
Initiates a new session.
*   **Request Body:**
    ```json
    {
      "username": "admin",
      "password": "your_secure_password",
      "role": "admin"
    }
    ```
*   **Response (200 OK):**
    ```json
    {
      "success": true,
      "user": {
        "id": 1,
        "username": "admin",
        "role": "admin"
      }
    }
    ```
*   **Security:** Sets `HttpOnly`, `SameSite=Lax` cookie.

#### `POST /logout`
*   **Action:** Invalidates the session on the server and clears the client cookie.

### 2. Shipment Operations (`/admin/shipments`)

#### `POST /create`
Creates a brand new shipment.
*   **Request Body:**
    ```json
    {
      "sender_name": "Alice Corp",
      "sender_mobile": "9876543210",
      "sender_address": "123 Ind Estate, Mumbai",
      "sender_pincode": "400001",
      "receiver_name": "Bob Retail",
      "receiver_mobile": "9123456780",
      "receiver_address": "45 Market Rd, Delhi",
      "receiver_pincode": "110001",
      "weight": 10.5,
      "price": 500.00
    }
    ```
*   **Response (201 Created):**
    ```json
    {
      "success": true,
      "shipment": {
        "tracking_id": "MX88921",
        "status": "pending",
        "created_at": "2026-01-04T12:00:00Z"
      }
    }
    ```

#### `GET /:id`
Fetches detailed info for a single shipment.
*   **Response:** Returns full object including `event_history` array.

#### `PUT /:id/status`
Updates shipment status.
*   **Request Body:** `{"status": "in_transit", "notes": "Picked up from hub"}`

### 3. Utility Endpoints

#### `GET /api/dashboard/public/check-service/:pincode`
Checks if we serve a specific area.
*   **Example:** `/api/dashboard/public/check-service/400001`
*   **Response:** `{"serviceable": true, "hub": "Mumbai Central"}`

#### `GET /api/photos/:tracking_id`
Retrieves Signed URLs for Proof-of-Delivery photos.
*   **Response:** `{"urls": ["https://supabase...signed_url_1", "https://..."]}`

---

## 💻 Developer Guide & Best Practices

### Code Style
1.  **Immutability:** Prefer `const` over `let`. Never use `var`.
2.  **Async/Await:** Use modern async syntax. Avoid Callback Hell.
3.  **Comments:** Document complex logic, especially in `session.js`.

### Adding a New Feature
1.  **Frontend:** Create the HTML view in `admin/` or `dashboards/`.
2.  **Route:** Add the navigation link in `partials/admin-sidebar.html`.
3.  **Backend:** Create a new route file in `backend/routes/`.
4.  **Register:** Import and use the route in `backend/src/app.js`.
5.  **Test:** verify using Postman or cURL.

---

## 🔧 Troubleshooting & Known Issues

### "White Screen of Death"
*   **Symptom:** You visit `/admin/dashboard.html` and see nothing.
*   **Cause:** You are not logged in. The server checks for the session cookie and blocks the file requests.
*   **Fix:** Go to `/` (Root), log in, and then navigate back.

### "500 Internal Server Error" on Login
*   **Cause:** Database connection failed.
*   **Fix:** Check your `.env`. If using Supabase, ensure `?sslmode=require` is at the end of `DATABASE_URL`.

### "CORS Error" in Console
*   **Symptom:** API calls fail with "Access-Control-Allow-Origin".
*   **Cause:** Your `FRONTEND_URL` in `.env` does not match the URL in your browser bar.
*   **Fix:** Ensure they match exactly (including `http` vs `https` and trailing slashes).

---

<div align="center">
  <p><strong>MoveX Logistics Platform</strong></p>
  <p>For deployment instructions, strictly refer to <code>PRODUCTION.md</code>.</p>
</div>
Get MoveX running locally in less than 5 minutes.

### Prerequisites
- **Node.js** 18.x or higher (Required for `crypto` module)
- **PostgreSQL** 14+ (or Supabase Cloud)
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/movex.git
   cd movex/backend
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Configure Environment**
   ```bash
   cp ../.env.example ../.env
   # CRITICAL: Set SESSION_SECRET to a 32+ char random string in .env
   ```

4. **Run Database Migrations**
   Use `psql` or Supabase SQL Editor to run the scripts in `/backend/sql/` strictly in this order:
   - `001_init_users.sql` (Creates users table)
   - `011_create_shipments.sql` (Creates key shipment tables)
   - `017_franchise_updates.sql` (Latest schema patches)

5. **Start Server**
   ```bash
   npm start
   # Server runs at http://localhost:4000
   ```

### Access Points
- **Public Tracking:** [`http://localhost:4000/`](http://localhost:4000/)
- **Admin Panel:** [`http://localhost:4000/admin/dashboard.html`](http://localhost:4000/admin/dashboard.html)
- **Health Check:** [`http://localhost:4000/api/health`](http://localhost:4000/api/health)

---

## 🧠 System Architecture

MoveX is designed as a **Privacy-First, Monolithic Application** to ensure data sovereignty and speed.

### 1. The "Hybrid SPA" Frontend
We eschew heavy frameworks (React/Vue) for a custom **Hyper-Lightweight Router**.
- **Core Logic:** `js/admin-layout.js` intercepts all `<a>` clicks.
- **Mechanism:** Fetches raw HTML via `fetch()`, strips the `<head>`, and swaps the `<body>` content into `<main id="app-content">`.
- **Benefit:** 99/100 Lighthouse Performance score. Zero build step.

### 2. The "Iron Fortress" Backend
The Node.js/Express server (`backend/src/app.js`) acts as a rigid security gate.
- **Static Firewall (`protectStaticDashboards`)**: Intercepts requests to `*.html`. If no valid database session exists, the file is **never served**.
- **Security Headers**: Standardized `helmet` configuration with strict `Content-Security-Policy`.

### 3. Database-Backed Auth
- **No JWTs for Sessions**: We use opaque tokens stored in PostgreSQL (`sessions` table).
- **Sliding Window:** tokens expire in 1 hour but auto-renew on activity.
- **Reference:** See `backend/src/session.js` for the custom session store implementation.

---

## 📦 Core Features

### Shipment Management
- **End-to-End Tracking:** From "Pending" to "Delivered" with granular status updates.
- **Full Address Support:** Captures Name, Mobile, Address, and Pincode for Sender/Receiver.
- **Financials:** Tracks Price, Weight (KG), and Payment Status.

### Label Printing Engine
Located at `admin/print_label.html`.
- **One-Click Print:** Generates 4x6 labels instantly.
- **Barcodes:** Uses **Code128** standard (via `JsBarcode`).
- **Zero Storage:** Labels are generated client-side on demand; no PDF files clog the server.

### Photo Proof-of-Delivery
- **Storage:** Uses **Supabase Storage** (Private Buckets).
- **Security:** Photos are accessed via Signed URLs (Time-limited).
- **Organization:** Stored as `/{tracking_id}/{timestamp}_{type}.jpg`.

---

## 📁 Project StructureMap

```
movex/
├── backend/               
│   ├── src/
│   │   ├── app.js         # Entry Point & Middleware Chain
│   │   ├── session.js     # Custom DB Session Store
│   │   └── controllers/   # Business Logic
│   ├── sql/               # Database Migration Scripts
│   └── middleware/        # Security (CORS, RateLimit, Auth)
├── admin/                 # Admin HTML Templated Pages
├── dashboards/            # Role-Specific Dashboards (Franchise/Staff)
├── js/                    # Frontend Clientside Logic
│   ├── admin-core.js      # Dashboard Controller
│   └── auth-api.js        # Login/Logout Handlers
├── styles/                # CSS Variables & Design System
└── PRODUCTION.md          # 🛑 READ THIS BEFORE DEPLOYING
```

---

## 📡 API Reference Manual

The API is primarily internal but follows RESTful standards.

### Authentication (`/api/auth`)

#### `POST /login`
**Request:**
```json
{
  "username": "admin",
  "password": "secure_password",
  "role": "admin"
}
```
**Response:** `200 OK` (Sets `movex.sid` HttpOnly Cookie)

#### `POST /logout`
**Action:** Destroys session in DB and clears client cookie.

### Shipments (`/admin/shipments`)

#### `POST /create`
Creates a new shipment and auto-generates a Tracking ID (e.g., `MX00521`).
**Request Payload:**
```json
{
  "sender_name": "John Doe",
  "sender_mobile": "9876543210",
  "sender_address": "123 Main St, Mumbai",
  "sender_pincode": "400001",
  "receiver_name": "Jane Smith",
  "receiver_mobile": "9876543211",
  "receiver_address": "456 Park Ave, Delhi",
  "receiver_pincode": "110001",
  "weight": 2.5,
  "price": 150.00
}
```

#### `GET /:id`
Returns full shipment details + history timeline.

---

## 💻 Developer Guide

### Development Workflow
1. **Branching:** Use `feat/feature-name` or `fix/issue-name`.
2. **Commits:** We use semantic commits (e.g., `feat: added label printing`).
3. **Database:** Always write a `.sql` migration file for schema changes.

### Adding a New Admin Page
1. **Create File:** Copy `admin/dashboard.html` to `admin/your-page.html`.
2. **Link:** Add entry to `partials/admin-sidebar.html`.
3. **Guard:** Update `js/dashboard-guard.js` to whitelist the new page for specific roles.
4. **Logic:** Register a new initializer in `js/admin-core.js`.

---

## 🔧 Troubleshooting & FAQ

### "I see a white screen on Dashboard"
*   **Reason:** The `protectStaticDashboards` middleware blocked the HTML load because your session is invalid.
*   **Fix:** Navigate to `/` (Login Page) and sign in.

### "Connection Refused (500 Error)"
*   **Reason:** Database credentials in `.env` are wrong or Supabase is paused.
*   **Fix:** Check `DATABASE_URL` matches your cloud provider string exactly.

### "Images are not uploading"
*   **Reason:** This feature is **Disabled by default** in `app.js` to save costs.
*   **Fix:** Uncomment the `photos` route in `app.js` and set `SUPABASE_SERVICE_KEY` in `.env`.

---

<div align="center">
  <p><strong>MoveX</strong> - Secure by Design. Built for Scale.</p>
  <p>See <a href="./PRODUCTION.md">PRODUCTION.md</a> for Deployment Guide</p>
</div>  "success": true,
  "user": {
    "id": 1,
    "username": "admin",
    "role": "admin",
    "organization": null
  }
}
```
**Errors:**
- `401 Unauthorized`: Invalid credentials.
- `429 Too Many Requests`: 5 failed attempts in 15 mins.

### 2. Shipments

#### `POST /admin/shipments/create`
**Request:**
```json
{
  "sender_name": "John Doe",
  "sender_mobile": "9876543210",
  "sender_address": "123 Main St, Mumbai",
  "sender_pincode": "400001",
  "receiver_name": "Jane Smith",
  "receiver_mobile": "9876543211",
  "receiver_address": "456 Park Ave, Delhi",
  "receiver_pincode": "110001",
  "weight": 2.5,
  "price": 150.00
}
```
**Response (201 Created):**
```json
{
  "success": true,
  "shipment": {
    "tracking_id": "MX00052",
    "status": "pending",
    "estimated_delivery": "2026-01-10T..."
  }
}
```

### 3. Utility

#### `GET /api/dashboard/public/check-service/:query`
**Usage:** Check if a Pincode or City is serviceable.
**Response:**
```json
{
  "serviceable": true,
  "organization": {
    "name": "Mumbai Central Hub",
    "pincodes": "400001, 400002"
  }
}
```

---

<div align="center">
  <p><strong>MoveX</strong> - End of README</p>
</div>
