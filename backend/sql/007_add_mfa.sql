-- Add mfa_enabled to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;

-- Update existing NULLs to FALSE
UPDATE users SET mfa_enabled = FALSE WHERE mfa_enabled IS NULL;
