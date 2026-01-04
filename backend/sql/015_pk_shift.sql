-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Migration: Primary Key Shift & Session Optimization
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Remove email column from sessions
ALTER TABLE sessions DROP COLUMN IF EXISTS email;

-- 2. Enhance Sessions Table with Sequential IDs
-- Rename existing random 'id' to 'token' and add a new serial 'id'
ALTER TABLE sessions RENAME COLUMN id TO token;
ALTER TABLE sessions ADD COLUMN id_new SERIAL;

-- Temporarily remove old PK constraint
ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_pkey;

-- Set the new sequential ID as the primary key
ALTER TABLE sessions RENAME COLUMN id_new TO id;
ALTER TABLE sessions ADD PRIMARY KEY (id);

-- Update Sessions to use username instead of user_id
ALTER TABLE sessions ADD COLUMN username VARCHAR(255);

-- Migrate data (best effort)
UPDATE sessions s SET username = (SELECT username FROM users u WHERE u.id = s.user_id);

-- Drop old user_id column
ALTER TABLE sessions DROP COLUMN user_id;

-- 3. Shift Users Table Primary Key to Username
-- First drop all foreign key constraints referencing users.id
ALTER TABLE password_resets DROP CONSTRAINT IF EXISTS password_resets_user_id_fkey;
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_user_id_fkey;

-- Now swap the Primary Key on users
ALTER TABLE users DROP CONSTRAINT IF EXISTS users_pkey CASCADE;
ALTER TABLE users ADD PRIMARY KEY (username);

-- 4. Update Referencing Tables to use Username
-- Update password_resets
ALTER TABLE password_resets ADD COLUMN username VARCHAR(255);
UPDATE password_resets p SET username = (SELECT username FROM users u WHERE u.id = p.user_id);
ALTER TABLE password_resets DROP COLUMN user_id;
ALTER TABLE password_resets ADD CONSTRAINT password_resets_username_fkey FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE;

-- Update shipments
ALTER TABLE shipments ADD COLUMN creator_username VARCHAR(255);
UPDATE shipments s SET creator_username = (SELECT username FROM users u WHERE u.id = s.user_id);
ALTER TABLE shipments DROP COLUMN user_id;
ALTER TABLE shipments ADD CONSTRAINT shipments_username_fkey FOREIGN KEY (creator_username) REFERENCES users(username);

-- 5. Cleanup redundant columns
-- We keep 'id' in users as a sequential reference, but no longer as PK.
-- The user wants all IDs to be in a series (sequential).
-- Organizations and Shipments already use SERIAL/BIGSERIAL IDs.
