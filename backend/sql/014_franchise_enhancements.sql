-- Add pincodes and performance columns to organizations
ALTER TABLE organizations 
ADD COLUMN IF NOT EXISTS pincodes TEXT,
ADD COLUMN IF NOT EXISTS performance DECIMAL(5,2) DEFAULT 0.00;

-- Ensure type index exists
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
