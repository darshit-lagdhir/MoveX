-- Add missing profile columns to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS full_name VARCHAR(100),
ADD COLUMN IF NOT EXISTS phone VARCHAR(50);

-- Update existing users to have a default name if null (optional)
UPDATE users SET full_name = SPLIT_PART(email, '@', 1) WHERE full_name IS NULL;
