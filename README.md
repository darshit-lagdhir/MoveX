# MoveX - Modern Logistics System

<div align="center">
  <h3>A modern, secure logistics and courier management system</h3>
  <p>Built with Node.js, Express, PostgreSQL, and basic JavaScript</p>
</div>

---

## 🚀 Quick Start

### Things you need

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

# Setup your environment settings
cp ../.env.example ../.env
# Edit .env with your own settings

# Start the server
npm start
```

### Accessing the App

- **Main App:** http://localhost:4000
- **System Status:** http://localhost:4000/api/health
- **Admin Section:** http://localhost:4000/dashboards/admin/admin-dashboard.html

---

## 📦 Core Modules

MoveX is organized into **6 functional modules**:

| # | Module | Description |
|---|--------|-------------|
| 1 | **User Management** | Registration, login, roles, and session handling |
| 2 | **Franchise and Staff Operations** | Franchise management and staff assignments |
| 3 | **Customer Booking and Pricing** | Online booking and rate calculation |
| 4 | **Pickup and Dispatch Management** | Scheduling pickups and assigning deliveries |
| 5 | **Shipment Tracking and Delivery** | Real-time tracking and proof of delivery |
| 6 | **Reports and Analytics** | Dashboard metrics and business reports |

---

## 🏗️ How the System Works

MoveX uses a **Single-system design built for safety**, made to be an "Iron Fortress" for your delivery data.

### 1. The "Fast & Simple" Frontend
- **No special setup needed:** We do not use complex tools like Webpack. The code you see is exactly what runs in the browser.
- **Shadow Router (`dashboard-layout.js`):** A custom tool that catches clicks to load pages quickly without reloading the whole site.
- **Keeps your data visible:** The Sidebar and Header stay active while you move between pages, so the screen doesn't "blink."

### 2. The "Protected" Backend
- **File Protection:** Your private files (`.html`) are NOT public. A security layer checks if you are logged in before showing them.
- **Safe Session Control:** We use secure random codes instead of simple passwords in the browser. Admins can stop any user's login instantly.

---

## 📁 Project Structure

```
movex/
├── dashboards/             # Unified Dashboard System
│   ├── admin/              # admin-dashboard.html, admin-users.html, etc.
│   ├── franchisee/         # franchisee-dashboard.html, franchisee-shipments.html, etc.
│   ├── staff/              # staff-dashboard.html, staff-assignments.html
│   └── user/               # user-dashboard.html
├── backend/               
│   ├── middleware/        # Security check-posts (auth, limits, etc.)
│   ├── routes/            # Main URL paths
│   ├── src/
│   │   ├── app.js         # Main server file
│   │   ├── config/        # Database setup
│   │   ├── controllers/   # App logic
│   │   └── session.js     # Managing logins (saved in DB)
│   ├── sql/               # Combined database setup files (001-003)
│   └── utils/             # Helper tools
├── js/                    # Frontend JavaScript files
│   ├── dashboard-layout.js # Unified Layout Manager
│   ├── dashboard-guard.js  # Role-based protection logic
│   └── ...                 # Role-specific core files
├── styles/                # CSS design files
├── ERDIAGRAM/             # ER Diagram visualization (Chen notation)
├── index.html             # Main login page
├── SETUP.md               # Guide for real online setup
├── API.md                 # Detailed server connection guide
├── ARCHITECTURE.md        # How the system is built
└── README.md              # This file
```

### Important Folders
*   **`/admin` vs `/dashboards`**:
    *   **Admin**: High-security area. For managing users and settings.
    *   **Dashboards**: Special views for franchisees and staff (works on mobile).
*   **`/backend/src/session.js`**: Controls the login timer. It cleans up old logins every 15 minutes.

---

## 🔐 User Roles

| Role | What they can do | Dashboard link |
|------|--------------|-----------|
| **Admin** | Full control of the system | `/dashboards/admin/admin-dashboard.html` |
| **Franchisee** | Manage their own branch | `/dashboards/franchisee/franchisee-dashboard.html` |
| **Staff** | Daily work and parcel updates | `/dashboards/staff/staff-dashboard.html` |
| **User** | Simple tasks and viewing | `/dashboards/user/user-dashboard.html` |

---

## 🛠️ Setup Settings

### Environment Variables

Copy `.env.example` to `.env` and fill in:

```env
# Required
NODE_ENV=development
PORT=4000
JWT_SECRET=your-32+-character-secret
SESSION_SECRET=your-32+-character-secret
HEALTH_CHECK_KEY=secret-key-for-health-check

# Database settings
DATABASE_URL=postgresql://...  # Full connection link
# OR use individual details:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=your_password
DB_NAME=movex_auth
```

---

## 📖 API Paths

### Login & Signup
| Method | Path | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create a new account |
| POST | `/api/auth/login` | Log in (using username) |
| POST | `/api/auth/logout` | Log out |
| GET | `/api/auth/me` | Show current user info |
| GET | `/api/me` | Full profile & franchise details |

### Dashboard
| Method | Path | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/me` | My dashboard data |
| GET | `/api/dashboard/admin` | Admin dashboard data |
| GET | `/api/dashboard/admin/stats` | Main system numbers |
| GET | `/api/dashboard/public/serviceable-cities` | Cities where we work |

### Shipments (Admin)
| Method | Path | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/admin/shipments` | List all parcels |
| POST | `/api/dashboard/admin/shipments/create` | Create a new parcel |

### System Status
| Method | Path | Description |
|--------|----------|-------------|
| GET | `/api/health` | Simple status check |
| GET | `/api/health/detailed` | Full system status |
| GET | `/api/health/ready` | Readiness check |
| GET | `/api/health/live` | Liveness check |

---

## 🔒 Security Features

- ✅ **Safe Passwords:** Hiding passwords using "Bcrypt" (very strong).
- ✅ **Secure Cookies:** Keeping login session safe in the browser (HttpOnly).
- ✅ **Saved Logins:** Logins stay active even if the server restarts.
- ✅ **Request Limits:** Blocks hackers trying to guess passwords too fast.
- ✅ **CORS:** Only allows your own website to talk to the server.
- ✅ **Browser Protection:** Extra safety layers for the browser (CSP).
- ✅ **In-Depth Validation:** Ensuring all data sent by users is correct.
- ✅ **Database Safety:** Stops bad code from entering your database (SQL injection).
- ✅ **Auto-Redirect:** Logged-in users are automatically sent to their dashboard.

---

## 🗄️ Database

### Database Schema

MoveX uses PostgreSQL with the following tables:

| Table | Primary Key | Description |
|-------|-------------|-------------|
| organizations | organization_id | Franchise branches |
| users | username | User accounts |
| sessions | session_id | Active login sessions |
| password_resets | reset_id | Password recovery tokens |
| shipments | tracking_id | Parcel tracking records |


**See:** `ERDIAGRAM/index.html` for visual ER diagram.

### Supabase (Recommended for Production)

See **[SETUP.md](./SETUP.md)** for the full setup guide.

### Local PostgreSQL

```bash
# 1. Create the database
createdb movex_auth

# 2. Run these files in order to setup the tables
psql -d movex_auth -f backend/sql/001_schema.sql
psql -d movex_auth -f backend/sql/002_security.sql
psql -d movex_auth -f backend/sql/003_seeds.sql
```

---

## 📦 Managing Parcels (Shipments)

### Features
- **Add Parcels**: Full details for both sender and receiver.
- **Address Details**: Name, Phone, Address, and Pincode for both sides.
- **Weight**: Track parcel weight in KG.
- **Cost**: Manage how much the delivery costs.
- **Workflow**: Move status from "Pending" to "Delivered".
- **Delivery Date**: Automatically calculate when the parcel will arrive.

### Parcel Details Window
View everything in one place:
- Live status badge.
- Sender and receiver contact info.
- Route visualization (Start → End).
- Money, weight, and booking dates.
- Timeline of recent updates.

---

## 🏷️ Printing Labels

### Quick Printing (`admin/print_label.html`)
- **Print with one click**: Right from the parcel details window.
- **Autofill**: All data is pulled from the database automatically.
- **Barcodes**: Barcodes are made automatically for every parcel.
- **One-time use**: Labels are made only when you click print, so they don't fill up the server.

### What's on the Label?
| Field | Where it comes from |
|-------|--------|
| Tracking ID | From your database |
| Barcode | Made from the Tracking ID |
| Route | Start city and End city |
| Receiver | Name, Address, Phone, Pincode |
| Sender | Name and City |
| Weight | Total weight in KG |
| Price | Total cost in ₹ |
| Return Address | Sender's full address |

---

## 📸 Photo Proof

MoveX uses Supabase Storage for parcel photos:

- Photos are organized by their Tracking ID.
- Private storage that only allowed users can see.
- Supports JPEG, PNG, WebP, and more.
- Maximum file size: 5MB per photo.

---

## 🚢 Putting it Online (Deployment)

### Recommended Platforms (Split Architecture)

- **Backend**: **Render** (Node.js Web Service)
- **Frontend**: **Cloudflare** (Pages / Workers)
- **Database**: **Supabase** (PostgreSQL)

Configuring the connection between them is handled via `js/config.js` (Frontend) and Environment Variables (Backend).

### Checklist before going live

- [ ] Set `NODE_ENV=production`.
- [ ] Use long, random secrets for your passwords and tokens (32+ characters).
- [ ] Setup your Supabase database.
- [ ] Update your `FRONTEND_URL` so the app works online.
- [ ] Make sure your website uses a secure padlock (HTTPS).

---

## 📄 Documentation

- **[ERDIAGRAM/index.html](./ERDIAGRAM/index.html)** - Visual ER Diagram (Chen Notation)
- **[SETUP.md](./SETUP.md)** - Full guide for real setup.
- **[API.md](./API.md)** - Full list of server paths and data.
- **[ARCHITECTURE.md](./ARCHITECTURE.md)** - Deep dive into how code is organized.
- **[.env.example](./.env.example)** - List of all settings you can use.

---

## 🤝 Contributing

1. Fork the project.
2. Make a new branch (`git checkout -b feature/new-stuff`).
3. Add your changes and commit (`git commit -m 'Added something cool'`).
4. Push and open a request to merge.

---

<div align="center">
  <p><strong>MoveX</strong> - Moving logistics forward</p>
</div>
