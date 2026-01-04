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

## Section 3: Supabase Setup Guide (Step-by-Step)

### What is Supabase?

Supabase is a managed backend service that provides:

1. **PostgreSQL Database** - A fully managed PostgreSQL database (the same database technology MoveX already uses locally)
2. **Storage** - File storage with access control (for photos)
3. **Authentication** - Optional auth service (we use our own)
4. **Realtime** - Optional realtime subscriptions

**Important:** Supabase PostgreSQL is **standard PostgreSQL**. Your existing queries, tables, and code will work exactly the same. You're just changing WHERE the database runs, not HOW it works.

### PgAdmin vs Supabase

| Aspect | PgAdmin | Supabase |
|--------|---------|----------|
| **What it is** | GUI tool to view/manage databases | Cloud platform hosting databases |
| **Where runs** | Your computer | Supabase servers |
| **Data storage** | Your local machine | Cloud (backed up automatically) |
| **Access** | Only from your computer | From anywhere with connection string |
| **Required?** | Optional (development tool) | No, but recommended for production |

**Key Point:** PgAdmin is like a file explorer for databases. Supabase is like cloud storage for your database. You can use PgAdmin to connect TO Supabase if you want a visual interface.

### Step 1: Create a Supabase Account and Project

1. Go to [supabase.com](https://supabase.com)
2. Click "Start your project" → Sign up with GitHub/Email
3. Click "New Project"
4. Fill in:
   - **Name:** `movex-production` (or any name)
   - **Database Password:** Generate a strong password → **SAVE THIS IMMEDIATELY**
   - **Region:** Choose closest to your users (e.g., Mumbai for India)
5. Click "Create new project"
6. Wait 2-3 minutes for project creation

### Step 2: Locate Database Credentials

1. In your Supabase project dashboard, click **Settings** (gear icon) → **Database**
2. Scroll to "Connection string" section
3. You'll see:
   - **Host:** `db.xxxxxxxxxxxx.supabase.co`
   - **Database name:** `postgres`
   - **Port:** `5432` (direct) or `6543` (pooled - recommended)
   - **User:** `postgres`
   - **Password:** The password you saved in Step 1

4. Copy the "Connection string" → Choose the **URI** format:
   ```
   postgresql://postgres:[YOUR-PASSWORD]@db.xxxxxxxxxxxx.supabase.co:6543/postgres
   ```

### Step 3: Understand the Connection URL Format

```
postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:6543/postgres
│            │         │          │                            │    │
│            │         │          │                            │    └── Database name
│            │         │          │                            └── Port (6543 = pooled)
│            │         │          └── Host (unique per project)
│            │         └── Your database password
│            └── Username (always 'postgres' for Supabase)
└── Protocol (always postgresql)
```

**Port Options:**
- `5432` = Direct connection (limited connections, use for migrations)
- `6543` = Connection pooler (recommended for apps, handles many connections)

### Step 4: Configure MoveX for Supabase

1. **Copy your Supabase connection URL**

2. **Open your `.env` file** in the project root and add/update:

```env
# Database Connection (Supabase)
DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:6543/postgres?sslmode=require

# Individual credentials (fallback if DATABASE_URL not set)
DB_HOST=db.[YOUR-PROJECT-REF].supabase.co
DB_PORT=6543
DB_USER=postgres
DB_PASSWORD=[YOUR-PASSWORD]
DB_NAME=postgres
DB_SSL=true
```

3. **Important:** Add `?sslmode=require` to the DATABASE_URL - Supabase requires SSL

### Step 5: Create Tables in Supabase

1. In Supabase dashboard, go to **SQL Editor**
2. Run the following SQL to create required tables:

```sql
-- Create enums (if not exists)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'franchisee', 'staff', 'user', 'customer');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE user_status AS ENUM ('active', 'disabled', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Users table
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(255),
    phone VARCHAR(50),
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    mfa_enabled BOOLEAN DEFAULT false,
    oauth_provider VARCHAR(50),
    organization_id BIGINT,
    security_answers JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_login_at TIMESTAMPTZ
);

-- Organizations table
CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50),
    service_area VARCHAR(255),
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Password reset tokens
CREATE TABLE IF NOT EXISTS password_resets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);

-- Foreign key for organizations
ALTER TABLE users 
ADD CONSTRAINT fk_users_organization 
FOREIGN KEY (organization_id) REFERENCES organizations(id) ON DELETE SET NULL;
```

### Step 6: Test Connection Locally

1. Make sure your `.env` is updated with Supabase credentials
2. Restart your backend:
   ```bash
   cd backend
   npm start
   ```
3. Check for "Auth API listening on port 4000" message
4. If you see database errors, verify:
   - Connection string is correct
   - Password has no special characters that need URL encoding
   - `?sslmode=require` is appended to DATABASE_URL

### Step 7: Create Initial Admin User

Run this SQL in Supabase SQL Editor (replace password hash with a real bcrypt hash):

```sql
-- First, generate a password hash using bcrypt (cost 12)
-- You can use: https://bcrypt-generator.com/ or run in Node:
-- const bcrypt = require('bcrypt'); console.log(bcrypt.hashSync('YourPassword123', 12));

INSERT INTO users (email, password_hash, role, status, full_name)
VALUES (
    'admin@movex.com',
    '$2b$12$YOUR_GENERATED_BCRYPT_HASH_HERE',
    'admin',
    'active',
    'System Administrator'
);
```

**Never commit real passwords or hashes to git!**

---

## Section 4: Environment Variables List and Purpose

Copy `.env.example` to `.env` and fill in all values:

```env
# ═══════════════════════════════════════════════════════════
# APPLICATION
# ═══════════════════════════════════════════════════════════
NODE_ENV=production                    # 'development' or 'production'
PORT=4000                              # Server port

# ═══════════════════════════════════════════════════════════
# DATABASE (Supabase PostgreSQL)
# ═══════════════════════════════════════════════════════════
# Option 1: Connection URL (recommended)
DATABASE_URL=postgresql://postgres:PASSWORD@db.PROJECT.supabase.co:6543/postgres?sslmode=require

# Option 2: Individual credentials (fallback)
DB_HOST=db.PROJECT.supabase.co
DB_PORT=6543
DB_USER=postgres
DB_PASSWORD=your_supabase_db_password
DB_NAME=postgres
DB_SSL=true

# ═══════════════════════════════════════════════════════════
# AUTHENTICATION & SESSIONS
# ═══════════════════════════════════════════════════════════
# CRITICAL: Must be random, 32+ characters each
# Generate with: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=your_64_character_random_hex_string_here
SESSION_SECRET=another_64_character_random_hex_string_here
SESSION_MAX_AGE=3600000                # 1 hour in milliseconds

# ═══════════════════════════════════════════════════════════
# SECURITY
# ═══════════════════════════════════════════════════════════
CSRF_ENABLED=true                      # Enable CSRF protection
SESSION_SECURE=true                    # Secure cookies (requires HTTPS)
SESSION_SAME_SITE=Strict               # Cookie same-site policy

# ═══════════════════════════════════════════════════════════
# RATE LIMITING
# ═══════════════════════════════════════════════════════════
RATE_LIMIT_LOGIN=5                     # Max login attempts per 15 min
RATE_LIMIT_REGISTER=3                  # Max register attempts per 15 min
RATE_LIMIT_FORGOT_PASSWORD=3           # Max password reset per 15 min
RATE_LIMIT_GENERAL=100                 # Max general API calls per 15 min

# ═══════════════════════════════════════════════════════════
# STORAGE (Supabase Storage)
# ═══════════════════════════════════════════════════════════
SUPABASE_URL=https://PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...               # Public anon key (safe for frontend)
SUPABASE_SERVICE_KEY=eyJ...            # Service key (BACKEND ONLY - never expose!)
STORAGE_BUCKET=shipment-photos         # Bucket name for photos

# ═══════════════════════════════════════════════════════════
# FRONTEND URL (for CORS)
# ═══════════════════════════════════════════════════════════
FRONTEND_URL=https://your-domain.com   # Production frontend URL

# ═══════════════════════════════════════════════════════════
# LOGGING
# ═══════════════════════════════════════════════════════════
LOG_LEVEL=info                         # 'debug', 'info', 'warn', 'error'
LOG_AUTH_ATTEMPTS=true                 # Log authentication events

# ═══════════════════════════════════════════════════════════
# MONITORING
# ═══════════════════════════════════════════════════════════
HEALTH_CHECK_KEY=your_secret_key       # Protects /api/health/detailed in production
```

### Environment Variable Rules

1. **Never commit `.env` to git** - `.gitignore` already excludes it
2. **Use `.env.example` as template** - Keep it updated but with placeholder values
3. **Generate unique secrets** - Never reuse secrets across environments
4. **Validate at startup** - App should fail if critical vars are missing

---

## Section 5: Database Structure Overview

### Tables

#### `users`
Primary user table for authentication and authorization.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| email | VARCHAR(255) | Login identifier (unique) |
| password_hash | TEXT | bcrypt hashed password |
| full_name | VARCHAR(255) | Display name |
| phone | VARCHAR(50) | Contact number |
| role | user_role | ENUM: admin, franchisee, staff, user, customer |
| status | user_status | ENUM: active, disabled, suspended |
| mfa_enabled | BOOLEAN | MFA status |
| oauth_provider | VARCHAR(50) | OAuth provider if applicable |
| organization_id | BIGINT | FK to organizations |
| security_answers | JSONB | Password recovery questions |
| created_at | TIMESTAMPTZ | Account creation time |
| last_login_at | TIMESTAMPTZ | Last successful login |

#### `organizations`
Franchise/organization data.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| name | VARCHAR(255) | Organization name |
| type | VARCHAR(50) | Organization type |
| service_area | VARCHAR(255) | Service coverage area |
| status | VARCHAR(50) | Active/inactive status |
| created_at | TIMESTAMPTZ | Creation timestamp |

#### `password_resets`
Secure password reset token storage.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| user_id | BIGINT | FK to users |
| token_hash | TEXT | SHA-256 hash of reset token |
| expires_at | TIMESTAMPTZ | Token expiration time |
| used | BOOLEAN | Whether token was consumed |
| created_at | TIMESTAMPTZ | Token creation time |

#### `sessions`
Database-backed session storage for persistent logins.

| Column | Type | Description |
|--------|------|-------------|
| id | VARCHAR(255) | Primary key (session token) |
| user_id | INTEGER | FK to users |
| role | VARCHAR(255) | User role at session creation |
| email | VARCHAR(255) | User email |
| created_at | BIGINT | Session creation timestamp (ms) |
| expires_at | BIGINT | Session expiry timestamp (ms) |
| last_accessed_at | BIGINT | Last activity timestamp (ms) |

#### `shipments`
Shipment/parcel tracking data.

| Column | Type | Description |
|--------|------|-------------|
| id | BIGSERIAL | Primary key |
| tracking_id | VARCHAR(50) | Unique tracking number |
| sender_name | VARCHAR(100) | Sender's name |
| sender_mobile | VARCHAR(20) | Sender's phone |
| sender_address | TEXT | Sender's full address |
| sender_pincode | VARCHAR(10) | Sender's PIN code |
| receiver_name | VARCHAR(100) | Receiver's name |
| receiver_mobile | VARCHAR(20) | Receiver's phone |
| receiver_address | TEXT | Receiver's full address |
| receiver_pincode | VARCHAR(10) | Receiver's PIN code |
| origin_address | TEXT | Origin city/location |
| destination_address | TEXT | Destination city/location |
| status | VARCHAR(50) | pending, in_transit, delivered, failed |
| price | DECIMAL(10,2) | Shipment cost |
| weight | DECIMAL(10,2) | Package weight in KG |
| estimated_delivery | TIMESTAMPTZ | Expected delivery date |
| created_at | TIMESTAMPTZ | Booking timestamp |
| updated_at | TIMESTAMPTZ | Last status update |

### Indexes

- `idx_users_email` - Fast email lookups (login)
- `idx_users_role` - Role-based queries
- `idx_users_status` - Active user filtering
- `idx_password_resets_user` - User's reset tokens
- `idx_password_resets_token` - Token validation
- `idx_shipments_tracking` - Fast tracking ID lookups
- `idx_shipments_status` - Status-based filtering

---

## Section 6: Storage Strategy for Photos

### Overview

MoveX stores shipment photos using Supabase Storage with tracking ID-based organization.

### Storage Structure

```
shipment-photos/                    # Bucket (private)
├── MX29801/                       # Tracking ID folder
│   ├── 1703251200000_pickup.jpg   # Timestamp_type.jpg
│   ├── 1703252800000_delivery.jpg
│   └── 1703252850000_signature.jpg
├── MX29802/
│   └── 1703253600000_pickup.jpg
└── ...
```

### File Naming Convention

```
{TRACKING_ID}/{TIMESTAMP}_{TYPE}.{EXTENSION}

Examples:
MX29801/1703251200000_pickup.jpg
MX29801/1703252800000_delivery.jpg
MX29801/1703252850000_damage.jpg
```

| Component | Description |
|-----------|-------------|
| TRACKING_ID | Shipment tracking ID (e.g., MX29801) |
| TIMESTAMP | Unix timestamp in milliseconds |
| TYPE | Photo type: pickup, delivery, signature, damage, pod |
| EXTENSION | File extension (jpg, png, webp) |

### Access Control

1. **Bucket is PRIVATE** - No public access
2. **Backend generates signed URLs** - Time-limited access (1 hour default)
3. **URLs are per-photo** - Each photo requires specific permission
4. **Database stores paths, not URLs** - URL generated on demand

### Database Photo Reference

Store photo references in a shipment_photos table:

```sql
CREATE TABLE IF NOT EXISTS shipment_photos (
    id BIGSERIAL PRIMARY KEY,
    tracking_id VARCHAR(50) NOT NULL,
    photo_type VARCHAR(50) NOT NULL,
    storage_path TEXT NOT NULL,
    uploaded_by BIGINT REFERENCES users(id),
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    file_size INTEGER,
    mime_type VARCHAR(100)
);

CREATE INDEX idx_shipment_photos_tracking ON shipment_photos(tracking_id);
```

### Photo Upload Flow

1. Frontend requests upload permission from backend
2. Backend validates user session and permissions
3. Backend generates signed upload URL
4. Frontend uploads directly to Supabase Storage
5. Backend records photo metadata in database
6. For viewing: backend generates signed download URL

### Implementation Notes

- **Never store base64 images in database** - Use storage paths only
- **Always validate file types** - Accept only image/* MIME types
- **Limit file size** - 5MB max recommended
- **Generate thumbnails** - Consider edge function for optimization

---

---

## Section 7: Deployment Notes

### Recommended Platforms
MoveX is a standard Node.js application, making it compatible with almost any cloud provider.

#### Option 1: Railway (Preferred)
*   **Why:** Railway auto-detects `npm start`, handles SSL automatically, and provides a built-in PostgreSQL database.
*   **Config:** simply set the Environment Variables in the web dashboard.

#### Option 2: VPS (DigitalOcean/AWS)
*   **Why:** Total control and lower cost at scale.
*   **Requirements:**
    *   **Process Manager:** Use `pm2` to keep the app running (`pm2 start src/app.js`).
    *   **Reverse Proxy:** Use Nginx to handle SSL termination and forward traffic to port 4000.
    *   **Firewall:** Allow ports 80, 443, and 22 only. Block port 4000 externally.

### Pre-Flight Checklist
Before flipping the switch to "Live":
1.  [ ] **HTTPS Enforcement:** Ensure `NODE_ENV` is set to `production`. This forces the server to reject HTTP connections (HSTS).
2.  [ ] **Secret Strength:** Verify `SESSION_SECRET` is at least 32 characters long.
3.  [ ] **Database SSL:** Ensure `DATABASE_URL` ends with `?sslmode=require`.
4.  [ ] **CORS Lockdown:** Verify `FRONTEND_URL` matches your production domain exactly (no trailing slash mismatches).

---

## Section 8: Safe Change Protocol (SOP)

When modifying the system, follow this strict protocol to prevent downtime.

### The "Do No Harm" Rules
1.  **Backward Compatibility:** Never rename a database column. Create a new one, migrate data, then deprecate the old one.
2.  **Feature Flags:** When adding a risky feature (like a new payment gateway), wrap it in an `if (process.env.ENABLE_NEW_PAYMENT)` block.
3.  **Local Mirror:** Always test migration scripts on a local backup of the production DB before running them in the cloud.

### Emergency Rollback Procedure
If a deployment fails:
1.  **Code:** Revert the Git commit (`git revert HEAD`).
2.  **Database:** If you ran a destructive migration (like `DROP TABLE`), use Supabase Point-In-Time Recovery (PITR) immediately.
3.  **Session Purge:** If the issue is authentication-related, run `TRUNCATE sessions;` to force a global logout.

---

## Appendix A: Useful Commands

```bash
# Generate a cryptographically secure secret (Use this for SESSION_SECRET)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Verify file integrity (Check if app.js has been tampered with)
# On Windows PowerShell:
Get-FileHash backend/src/app.js
```

---

## Appendix B: Troubleshooting Decision Tree

### 1. "Connection Refused" (Database)
*   **Check:** Is the Supabase project paused? (Free tier pauses after inactivity).
*   **Check:** Is the IP blocked? (Check Supabase Network Restrictions).
*   **Action:** Log in to the Supabase dashboard to wake the instance.

### 2. "CSRF Mismatch" / "Forbidden" (403)
*   **Context:** usually happens after a deployment.
*   **Check:** Did `SESSION_SECRET` change? If so, old cookies are invalid.
*   **Action:** User must clear cookies and log in again.

### 3. "White Screen" on Dashboard
*   **Context:** The HTML loads, but is blank.
*   **Check:** Open DevTools Console. Do you see CSP errors? ("Refused to load script...").
*   **Action:** You may be using a CDN not whitelisted in `helmet` config. Add the domain to `contentSecurityPolicy` in `app.js`.

---

<div align="center">
  <p><strong>MoveX Operations Manual</strong></p>
  <p>Ensure this document is reviewed before every major release.</p>
</div>
