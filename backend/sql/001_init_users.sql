-- 1) Create enums once (if not already)
CREATE TYPE user_role AS ENUM ('admin', 'franchisee', 'staff', 'user', 'customer');
CREATE TYPE user_status AS ENUM ('active', 'disabled', 'suspended');

-- 2) Add missing columns to existing users table
ALTER TABLE users
  ADD COLUMN IF NOT EXISTS role   user_role NOT NULL DEFAULT 'user',
  ADD COLUMN IF NOT EXISTS status user_status NOT NULL DEFAULT 'active';

-- 3) Optional indexes
CREATE INDEX IF NOT EXISTS idx_users_role   ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- Password reset tokens (hashed, time-limited, single-use)
CREATE TABLE IF NOT EXISTS password_resets (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);