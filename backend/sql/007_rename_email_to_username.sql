-- Rename email column to username
ALTER TABLE users RENAME COLUMN email TO username;

-- Update indexes
DROP INDEX IF EXISTS idx_users_email;
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- Make sure constraints are consistent (unique is carried over, but good to be sure)
-- (Renaming column usually preserves constraints)

-- Update any other tables if they reference email? 
-- password_resets references user_id.
-- No other obvious references.
