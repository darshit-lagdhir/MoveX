# MoveX Database Schema (Step 5)

## Users table

Single source of truth for identities and roles.

-- Enable case-insensitive text for email (optional but recommended)
CREATE EXTENSION IF NOT EXISTS citext;

-- Role and status enums
CREATE TYPE user_role AS ENUM ('admin', 'franchisee', 'staff', 'user', 'customer');
CREATE TYPE user_status AS ENUM ('active', 'disabled', 'suspended');

-- Core users table
CREATE TABLE IF NOT EXISTS users (
id BIGSERIAL PRIMARY KEY,
email CITEXT UNIQUE NOT NULL, -- login identifier, case-insensitive
password_hash TEXT NOT NULL, -- bcrypt/argon2 hash only
role user_role NOT NULL, -- enforced role set
status user_status NOT NULL DEFAULT 'active',
created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Optional future columns (not required yet)
-- last_login_at TIMESTAMPTZ,
-- password_changed_at TIMESTAMPTZ,
-- failed_login_attempts INTEGER NOT NULL DEFAULT 0,
-- lockout_until TIMESTAMPTZ;

-- Helpful indexes for future queries
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);


**Security notes**

- Passwords are stored only as one-way hashes in `password_hash` using bcrypt or argon2.
- Roles and status are constrained by enums to avoid invalid values.
- Backend enforces all auth logic; database is the authoritative data store.
