-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Consolidated Schema (v1.0)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Enums
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'franchisee', 'staff', 'user');
    CREATE TYPE user_status AS ENUM ('active', 'disabled', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- 2. Organizations
CREATE TABLE IF NOT EXISTS organizations (
    id BIGSERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'franchise',
    status VARCHAR(50) DEFAULT 'active',
    service_area TEXT,
    pincodes TEXT,
    non_serviceable_areas TEXT,
    full_address TEXT,
    performance DECIMAL(5,2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- 3. Users
CREATE TABLE IF NOT EXISTS users (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL UNIQUE,
    full_name VARCHAR(100),
    phone VARCHAR(50),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL,
    security_answers JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);

-- 4. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id BIGSERIAL PRIMARY KEY,
    token VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL,
    created_at BIGINT NOT NULL,
    expires_at BIGINT NOT NULL,
    last_accessed_at BIGINT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- 5. Password Resets
CREATE TABLE IF NOT EXISTS password_resets (
    id BIGSERIAL PRIMARY KEY,
    user_id BIGINT REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_password_resets_user ON password_resets(user_id);
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);

-- 6. Shipments
CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    tracking_id VARCHAR(50) UNIQUE NOT NULL,
    -- Sender Details
    sender_name VARCHAR(100),
    sender_mobile VARCHAR(20),
    sender_address TEXT,
    sender_pincode VARCHAR(20),
    -- Receiver Details
    receiver_name VARCHAR(100),
    receiver_mobile VARCHAR(20),
    receiver_address TEXT,
    receiver_pincode VARCHAR(20),
    -- Shipment Meta
    origin_address TEXT,
    destination_address TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_transit, delivered, failed, returned
    current_location VARCHAR(100),
    weight DECIMAL(10, 2) DEFAULT 1.0,
    price DECIMAL(10, 2) DEFAULT 0.00,
    estimated_delivery TIMESTAMPTZ,
    -- Meta
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    -- Relations
    user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
    organization_id BIGINT REFERENCES organizations(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_user ON shipments(user_id);
CREATE INDEX IF NOT EXISTS idx_shipments_org ON shipments(organization_id);

-- 7. Shipment Photos
CREATE TABLE IF NOT EXISTS shipment_photos (
    id BIGSERIAL PRIMARY KEY,
    tracking_id VARCHAR(50) NOT NULL,
    photo_type VARCHAR(50) NOT NULL, -- pickup, delivery, pod, damage
    storage_path TEXT NOT NULL,
    uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    file_size INTEGER,
    mime_type VARCHAR(100),
    deleted_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shipment_photos_tracking ON shipment_photos(tracking_id);

-- 8. Serviceable Cities
CREATE TABLE IF NOT EXISTS serviceable_cities (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL UNIQUE
);
