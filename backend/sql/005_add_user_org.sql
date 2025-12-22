-- Add organization_id to users table
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL;

-- Index
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
