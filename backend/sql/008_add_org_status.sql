-- Add status to organizations table
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS status VARCHAR(50) DEFAULT 'active';

-- Index
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);
