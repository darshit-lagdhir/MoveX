# MoveX Guide for Online Use

> **Last Updated:** January 6, 2026  
> **Version:** 1.1.0  
> **Status:** Ready for Real Customers

This document is a full guide for running MoveX online. It covers setting up the database, security settings, ways to put it online, and how to keep it running.

---

## Table of Contents

1. [What "Ready for Real Customers" Means for MoveX](#section-1-what-ready-for-real-customers-means-for-movex)
2. [How the System Works (Overview)](#section-2-how-the-system-works-overview)
3. [Supabase Setup Guide](#section-3-supabase-setup-guide-step-by-step)
4. [List of System Settings (Variables)](#section-4-list-of-system-settings-variables)
5. [Database Structure Overview](#section-5-database-structure-overview)
6. [How we save photos](#section-6-how-we-save-photos)
7. [Security Steps we took](#section-7-security-steps-we-took)
8. [Putting it Online (Deployment)](#section-8-putting-it-online-deployment)
9. [Common Mistakes to Stay Away From](#section-9-common-mistakes-to-stay-away-from)
10. [How to make changes safely](#section-10-how-to-make-changes-safely)
11. [Appendix A: Useful Commands](#appendix-a-useful-commands)
12. [Appendix B: Troubleshooting](#appendix-b-troubleshooting)
13. [Appendix C: Changelog](#appendix-c-changelog)

---

## Section 1: What "Ready for Real Customers" Means for MoveX

For MoveX, being "Ready for Real Customers" means the app can:

### ✅ Security Rules
- **Run online** without showing private info.
- **Handle real users** with a proper login system.
- **Save data safely** in a professional cloud database.
- **Handle mistakes** without the whole app stopping.
- **Block hackers** (XSS, Hacking, SQL Injection, Guessing passwords).

### ✅ Setup Rules
- All secrets are kept in the settings file, not in the code.
- No passwords or keys are written directly in the code.
- Secure locks (SSL) are used for database connections.
- Secure login settings are turned on for the real website.

### ✅ Daily Work Setup
- Clear logs to help fix bugs (without showing private data).
- Good error handling so users don't see technical errors.
- ✅ **Secure Cookies** for logins (HttpOnly).
- ✅ **Saved Logins** (even if the server restarts).
- ✅ **Request Limits** on login pages.
- ✅ **CORS** whitelist (only allows your domain).
- ✅ **CSP** Browser security layers.
- ✅ **Input Check** on every page.
- ✅ **Database Protection** (parameterized queries).
- ✅ **Smooth Loading** (no flickering screens).

### ❌ What it does NOT mean
- The app has every feature possible.
- No more work is needed.
- It is ready for millions of users at once.
- Everything is already online.

**Ready for Real Customers = Safe to put online, but still growing.**

---

## Section 2: How the System Works (Overview)

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────────┐   │
│  │ index.html  │  │ login.html   │  │ admin/*.html     │   │
│  │ (Home)      │  │ (Auth UI)    │  │ (Dashboard)      │   │
│  └─────────────┘  └──────────────┘  └──────────────────┘   │
│                          │                                   │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    js/*.js                             │  │
│  │  auth-api.js | admin-layout.js | admin-core.js         │  │
│  │  dashboard-guard.js                                    │  │
│  │                                                        │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ HTTP/HTTPS (port 4000)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                        BACKEND                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              backend/src/app.js                      │    │
│  │         (Express Server - Main Entry)                │    │
│  └─────────────────────────────────────────────────────┘    │
│                              │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                   MIDDLEWARE (in src/)                │  │
│  │  src/sessionMiddleware.js (Session & Auth)            │  │
│  │  src/app.js (Security & Connections)                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                      ROUTES                            │  │
│  │  src/routes/auth.routes.js                            │  │
│  │  backend/routes/dashboard.js                          │  │
│  │  backend/routes/profile.js                            │  │
│  └───────────────────────────────────────────────────────┘  │
│                              │                               │
│  ┌───────────────────────────────────────────────────────┐  │
│  │                    SESSION STORE                       │  │
│  │           backend/src/session.js (DB-backed)           │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
                              │
                              │ Database Protocol (port 5432/6543)
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                       DATABASE                               │
│  ┌─────────────────────────────────────────────────────┐    │
│  │              PostgreSQL (Supabase)                   │    │
│| Tables: users, organizations, shipments, serviceable_cities |
│  └─────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────┘

### Main Files

| File | What it does |
|------|---------|
| `backend/src/app.js` | **Main** server file that starts everything |
| `backend/src/config/db.js` | Database setup and connection |
| `backend/src/session.js` | Keeps users logged in (saved in DB) |
| `backend/src/sessionMiddleware.js` | Checks if a user is logged in |
| `backend/src/routes/*.js` | All main URL paths (Auth, Parcels) |
| `backend/routes/dashboard.js` | Dashboard logic |
| `.env` | Local settings file (private) |
| `.env.example` | Template for settings |

---

## Section 3: Supabase Setup Guide (Step-by-Step)

### What is Supabase?

Supabase is an online service that provides:

1. **PostgreSQL Database** - A professional cloud database (same as you use on your PC).
2. **Storage** - A place to save files like photos securely.
3. **Authentication** - A tool to handle logins (we use our own logic on top of this).
4. **Realtime** - Special features for instant updates.

**Note:** Supabase uses **standard PostgreSQL**. Your code and tables will work exactly the same online.

### PgAdmin vs Supabase

| Aspect | PgAdmin | Supabase |
|--------|---------|----------|
| **What it is** | A tool to view your data | A cloud website that hosts your data |
| **Where it runs** | On your computer | On Supabase servers |
| **Data storage** | On your local drive | Online (backed up automatically) |
| **Access** | Only from your computer | From anywhere with a link |
| **Required?** | No, but helpful for dev | No, but recommended for real use |

**Key Point:** PgAdmin is like a folder browser for data. Supabase is like Google Drive for your database.

### Step 1: Create a Supabase Account
1. Go to [supabase.com](https://supabase.com).
2. Sign up and click "New Project".
3. Fill in the name and **save your database password** immediately.
4. Choose the region closest to you (e.g., Mumbai for India).

### Step 2: Get your Database Details
1. In the Supabase dashboard, go to **Settings** -> **Database**.
2. Find the "Connection string" area and choose the **URI** format.
3. It will look like this:
   `postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:6543/postgres`

### Step 3: Setup MoveX Settings
Open your `.env` file and update these lines:

```env
# Database Connection (Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.xxxx.supabase.co:6543/postgres?sslmode=require

# Individual details (in case URL is not used)
DB_HOST=db.xxxx.supabase.co
DB_PORT=6543
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]
DB_NAME=postgres
DB_SSL=true
```

### Step 4: Create your Tables
Go to the **SQL Editor** in Supabase and run this code to setup the app:

```sql
-- 1. Create Roles
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'franchisee', 'staff', 'user');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 2. Create Statuses
DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'disabled', 'suspended');
EXCEPTION WHEN duplicate_object THEN null; END $$;

-- 3. Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    organization_id BIGINT,
    security_answers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'franchise',
    service_area TEXT,
    pincodes TEXT,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 6. Add Speed Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);

-- Link Users to Org
ALTER TABLE users ADD CONSTRAINT fk_users_organization FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
```

### Step 5: Test your connection
1. Update your `.env` with the Supabase details.
2. Run `npm start` in the backend folder.
3. If you see "Auth API listening on port 4000", it works!

### Step 6: Create First Admin User
Run this in the SQL Editor (change the password hash to a real one):

```sql
INSERT INTO users (username, password_hash, role, status, full_name)
VALUES ('admin_user', '$2b$12$YOUR_BCRYPT_HASH', 'admin', 'active', 'System Admin');
```

---

## Section 4: List of System Settings (Variables)

Copy `.env.example` to `.env` and fill these in:

```env
# APP SETTINGS
NODE_ENV=production                    # 'development' or 'production'
PORT=4000                              # Server port

# DATABASE SETTINGS
DATABASE_URL=postgresql://...          # Your Supabase link

# LOGIN & SESSION SETTINGS
# Use 64 random characters for these
JWT_SECRET=your_secret_key_here
SESSION_SECRET=another_secret_key_here
SESSION_MAX_AGE=3600000                # 1 hour in milliseconds

# SECURITY SETTINGS
SESSION_SECURE=true                    # Use only with HTTPS website
SESSION_SAME_SITE=Strict               # Extra security for cookies

# RATE LIMITS (Stops hackers from guessing passwords)
RATE_LIMIT_LOGIN=5                     # Max login tries in 15 mins
RATE_LIMIT_REGISTER=3                  # Max signups in 15 mins
RATE_LIMIT_FORGOT_PASSWORD=3           # Max resets in 15 mins
RATE_LIMIT_GENERAL=100                 # Max regular calls in 15 mins

# PHOTO STORAGE (Supabase)
SUPABASE_URL=https://...
SUPABASE_ANON_KEY=...                  # Safe for frontend
SUPABASE_SERVICE_KEY=...               # PRIVATE - Keep secret!
STORAGE_BUCKET=shipment-photos

# FRONTEND URL
FRONTEND_URL=https://your-site.com

# LOGGING
LOG_LEVEL=info
LOG_AUTH_ATTEMPTS=true

# MONITORING
HEALTH_CHECK_KEY=your_secret_key
```

---

## Section 5: Database Structure Overview

### Tables

#### `users` (User accounts)
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Main Key |
| username | VARCHAR(255) | Unique login name |
| password_hash | TEXT | Hidden password |
| full_name | VARCHAR(100) | Person's name |
| phone | VARCHAR(50) | Contact number |
| role | user_role | admin, franchisee, staff, user |
| status | user_status | active, disabled, suspended |
| organization_id | BIGINT | Linking to branch |
| security_answers | JSONB | Recovery questions |
| created_at | TIMESTAMPTZ | Signup date |
| updated_at | TIMESTAMPTZ | Last update date |

#### `organizations` (Branches)
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Main Key |
| name | VARCHAR(255) | Branch name |
| type | VARCHAR(50) | admin or franchise |
| service_area | TEXT | Area they cover |
| pincodes | TEXT | List of pincodes |
| status | VARCHAR(50) | active/inactive |

#### `shipments` (Parcels)
| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Main Key |
| tracking_id | VARCHAR(50) | Unique tracking code |
| sender_name | VARCHAR(100) | Who is sending |
| sender_mobile | VARCHAR(20) | Sender phone |
| sender_address | TEXT | Sender full address |
| receiver_name | VARCHAR(100) | Who is receiving |
| receiver_mobile | VARCHAR(20) | Receiver phone |
| receiver_address | TEXT | Receiver full address |
| status | VARCHAR(50) | pending, in_transit, delivered, failed |
| price | DECIMAL | Cost of delivery |
| weight | DECIMAL | Parcel weight in KG |
| created_at | TIMESTAMPTZ | Booking date |

#### `serviceable_cities`
| Column | Type | Description |
|--------|------|-------------|
| id | SERIAL | Main Key |
| name | VARCHAR(255) | City Name (e.g. "Mumbai, MH") |

---

## Section 6: How we save photos

MoveX saves photos in Supabase Storage organized by Parcel Tracking ID.

### Photo Folder Structure
```
shipment-photos/                    # Main storage bucket
├── MX29801/                       # Folder for parcel MX29801
│   ├── 1703251200_pickup.jpg      # Photo taken at pickup
│   └── 1703252800_delivery.jpg    # Photo taken at delivery
```

### Security for Photos
1. **Private Storage**: No one can see photos directly from a link.
2. **Temporary Links**: The server makes a "signed link" that only works for 1 hour when an admin wants to see a photo.
3. **Database Links**: We save the folder path in the database, not the photo itself.

---

## Section 7: Security Steps we took

### Login Security
| Step | What it does | Location |
|---------|---------------|----------|
| Scrambled Passwords | No one can read your password (Bcrypt) | `auth.controller.js` |
| Secure Cookies | Login data is locked in the browser | `sessionMiddleware.js` |
| Secret Length Check | Makes sure your keys are strong enough | `auth.controller.js` |
| Session Timeout | Logs you out after 1 hour of no work | `session.js` |

### Browser Security Settings
| Setting | What it does |
|---------|--------------|
| X-Frame-Options | Stops people from hiding our site in theirs (Clickjacking) |
| X-Content-Type | Stops the browser from guessing file types wrongly |
| X-XSS-Protection | Stops bad scripts from running in the browser |
| Content-Security-Policy | Only allows scripts from your own site |

---

## Section 8: Putting it Online (Deployment)

### Way 1: Railway (Recommended)
1. Connect your GitHub.
2. Add your settings (from `.env`) in the Railway dashboard.
3. Railway will put your app online automatically.

### Way 2: Render
1. Create a "New Web Service".
2. Set build command to: `cd backend && npm install`.
3. Set start command to: `cd backend && npm start`.
4. Add your settings (Variables).

### Way 3: VPS (DigitalOcean, AWS, etc.)
1. Install Node.js 18+.
2. Use **PM2** to keep the app running even if it crashes:
   ```bash
   npm install -g pm2
   cd backend
   pm2 start src/app.js --name movex
   pm2 save
   ```
3. Setup Nginx to handle the web traffic.

---

## Section 9: Maintenance & Backup

### Database Backups (Very Important)
- **Supabase**: Does backups automatically.
- **Manual Backup**: Run this command to save your data:
  `pg_dump -U postgres movex > backup_date.sql`

### Logs
The app saves logs. Use **pm2-logrotate** to keep them from taking up too much space.

---

## Section 10: Common Mistakes to Stay Away From

### ❌ Security Mistakes
| Mistake | Why it's bad | How to fix |
|---------|--------------|------------|
| Writing passwords in code | Anyone with the code can see them | Always use `.env` file |
| Sharing Service Keys | Harder for you to stay safe | Keep this key private! |
| No HTTPS | People can steal passwords on public Wi-Fi | Always use SSL/HTTPS |

### ❌ Database Mistakes
| Mistake | Why it's bad | How to fix |
|---------|--------------|------------|
| Mixing code and data | This allows database hacking | Use parameterized queries ($1, $2) |
| Port 5432 for app | Can run out of connections | Use Port 6543 (Pooled) |
| No indexes | The app gets very slow over time | Add indexes to important columns |

---

## Section 11: How to make changes safely

### Main Rules
1. **Never break what works**: New code must work with old data.
2. **Test on your PC first**: Never test on the real website.
3. **One change at a time**: Small changes are easier to fix.

### Safe Change Process
1. **Understand**: What am I changing? What could break?
2. **Try it out**: Test the change on your own computer.
3. **Check**: Does the admin still work? Does the login still work?
4. **Go Live**: Put it on the real website.
5. **Watch**: Look at the logs for any new errors.

---

## Appendix A: Useful Commands

```bash
# Generate a secret key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Generate a scrambled password
node -e "const b = require('bcrypt'); console.log(b.hashSync('mypassword', 12))"

# Start the app
cd backend && npm start
```

## Appendix B: Troubleshooting

### "Database Connection Error"
- Check your link in `.env`.
- Check if you added `?sslmode=require`.
- Make sure Supabase is not paused.

### "CORS Error"
- Make sure your `FRONTEND_URL` in `.env` matches your real website link exactly.

---

## Appendix C: History (Changelog)

### v1.1.0 (January 2, 2026)
- **Print Labels**: Added a way to print labels with barcodes.
- **Weight**: Added tracking for parcel weight.
- **Addresses**: Added full address support for sender and receiver.
- **Logins**: Now saving logins in the database for better reliability.

---

**End of Document**
