-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Database Schema (v2.0)
-- PostgreSQL | Supabase
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- PRIMARY KEYS & FOREIGN KEYS SUMMARY:
-- ┌─────────────────────────────────────────────────────────────────────────────┐
-- │  KEY              │  PRIMARY KEY IN    │  FOREIGN KEY IN                   │
-- ├─────────────────────────────────────────────────────────────────────────────┤
-- │  USERNAME         │  users             │  sessions, password_resets, shipments│
-- │  ORGANIZATION_ID  │  organizations     │  users, shipments                   │
-- │  TRACKING_ID      │  shipments         │  (Available for future tables)      │
-- └─────────────────────────────────────────────────────────────────────────────┘
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- 1. ENUM TYPES
-- ═══════════════════════════════════════════════════════════════════════════════

DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'franchisee', 'staff', 'user');
    CREATE TYPE user_status AS ENUM ('active', 'disabled', 'suspended');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- ═══════════════════════════════════════════════════════════════════════════════
-- 2. ORGANIZATIONS TABLE
--    PRIMARY KEY: organization_id
--    FOREIGN KEY: Referenced by users.organization_id, shipments.organization_id
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS organizations (
    -- Primary Key
    organization_id BIGSERIAL PRIMARY KEY,
    
    -- Organization Details
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'franchise',
    status VARCHAR(50) DEFAULT 'active',
    pincodes TEXT,
    non_serviceable_areas TEXT,
    full_address TEXT,
    performance NUMERIC(5,2) DEFAULT 0.00,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_organizations_type ON organizations(type);
CREATE INDEX IF NOT EXISTS idx_organizations_status ON organizations(status);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 3. USERS TABLE
--    PRIMARY KEY: username
--    FOREIGN KEY: organization_id → organizations(id)
--    REFERENCED BY: sessions, password_resets, shipments
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS users (
    -- Auto-generated ID (for internal use)
    user_id BIGSERIAL NOT NULL,
    
    -- Primary Key
    username VARCHAR(255) NOT NULL,
    
    -- User Details
    full_name VARCHAR(100),
    phone VARCHAR(50) CONSTRAINT users_phone_check CHECK (phone IS NULL OR phone ~ '^[0-9]{10}$'),
    password_hash VARCHAR(255) NOT NULL,
    role user_role NOT NULL DEFAULT 'user',
    status user_status NOT NULL DEFAULT 'active',
    security_answers JSONB DEFAULT '{}',
    
    -- Staff Specific
    staff_role TEXT,
    staff_status TEXT DEFAULT 'Active',
    
    -- Foreign Key: organization_id → organizations(organization_id)
    organization_id BIGINT,
    
    -- Timestamps
    last_login_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT users_pkey PRIMARY KEY (username),
    CONSTRAINT users_username_unique UNIQUE (username),
    CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) 
        REFERENCES organizations(organization_id) ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);
CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_org ON users(organization_id);
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 4. SESSIONS TABLE
--    PRIMARY KEY: session_id
--    FOREIGN KEY: username → users(username)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS sessions (
    -- Primary Key
    session_id SERIAL PRIMARY KEY,
    
    -- Session Details
    token VARCHAR(255),
    role VARCHAR(50),
    
    -- Foreign Key: username → users(username)
    username VARCHAR(255),
    
    -- Timestamps (stored as Unix timestamps for performance)
    created_at BIGINT,
    expires_at BIGINT,
    last_accessed_at BIGINT,
    
    -- Constraints
    CONSTRAINT sessions_token_unique UNIQUE (token),
    CONSTRAINT sessions_username_fkey FOREIGN KEY (username) 
        REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_sessions_token ON sessions(token);
CREATE INDEX IF NOT EXISTS idx_sessions_expires ON sessions(expires_at);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 5. PASSWORD_RESETS TABLE
--    PRIMARY KEY: reset_id
--    FOREIGN KEY: username → users(username)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS password_resets (
    -- Primary Key
    reset_id BIGSERIAL PRIMARY KEY,
    
    -- Foreign Key: username → users(username)
    username VARCHAR(255),
    
    -- Reset Token Details
    token_hash TEXT NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    used BOOLEAN NOT NULL DEFAULT FALSE,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT password_resets_username_fkey FOREIGN KEY (username) 
        REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_password_resets_token ON password_resets(token_hash);
CREATE INDEX IF NOT EXISTS idx_password_resets_username ON password_resets(username);

-- ═══════════════════════════════════════════════════════════════════════════════
-- 6. SHIPMENTS TABLE
--    PRIMARY KEY: tracking_id (unique shipment identifier)
--    FOREIGN KEYS: 
--      - creator_username → users(username)
--      - organization_id → organizations(organization_id)
-- ═══════════════════════════════════════════════════════════════════════════════

CREATE TABLE IF NOT EXISTS shipments (
    -- Auto-increment ID (for internal use only)
    shipment_id BIGSERIAL NOT NULL,
    
    -- PRIMARY KEY: tracking_id (unique shipment number like MX001, MX002)
    tracking_id VARCHAR(50) NOT NULL,
    
    -- Sender Details
    sender_name VARCHAR(100),
    sender_phone VARCHAR(20) CONSTRAINT shipments_sender_phone_check CHECK (sender_phone ~ '^[0-9]{10}$'),
    sender_address TEXT,
    sender_pincode VARCHAR(10) CONSTRAINT shipments_sender_pincode_check CHECK (sender_pincode ~ '^[0-9]{6}$'),
    
    -- Receiver Details
    receiver_name VARCHAR(100),
    receiver_phone VARCHAR(20) CONSTRAINT shipments_receiver_phone_check CHECK (receiver_phone ~ '^[0-9]{10}$'),
    receiver_address TEXT,
    receiver_pincode VARCHAR(10) CONSTRAINT shipments_receiver_pincode_check CHECK (receiver_pincode ~ '^[0-9]{6}$'),
    
    -- Shipment Details
    origin_address TEXT,
    destination_address TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    current_location VARCHAR(100),
    weight NUMERIC(10,2) DEFAULT 1.0,
    price NUMERIC(10,2) DEFAULT 0.00,
    estimated_delivery TIMESTAMP WITH TIME ZONE,
    
    -- Foreign Key: creator_username → users(username)
    creator_username VARCHAR(255),
    
    -- Foreign Key: organization_id → organizations(organization_id)
    organization_id BIGINT,
    
    -- Timestamps
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Constraints
    CONSTRAINT shipments_pkey PRIMARY KEY (tracking_id),
    CONSTRAINT shipments_creator_username_fkey FOREIGN KEY (creator_username) 
        REFERENCES users(username) ON UPDATE CASCADE ON DELETE SET NULL,
    CONSTRAINT shipments_organization_id_fkey FOREIGN KEY (organization_id) 
        REFERENCES organizations(organization_id) ON UPDATE CASCADE ON DELETE SET NULL
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_creator ON shipments(creator_username);
CREATE INDEX IF NOT EXISTS idx_shipments_org ON shipments(organization_id);



-- ═══════════════════════════════════════════════════════════════════════════════
-- FOREIGN KEY RELATIONSHIP DIAGRAM
-- ═══════════════════════════════════════════════════════════════════════════════
--
--   ┌─────────────────────────┐
--   │     ORGANIZATIONS       │
--   │   PK: organization_id   │◄─────────────────────────────────────┐
--   └──────────┬──────────────┘                                      │
--              │                                                     │
--              │ FK: organization_id                                 │ FK: organization_id
--              ▼                                                     │
--   ┌─────────────────────────┐                            ┌─────────┴───────────┐
--   │         USERS           │                            │     SHIPMENTS       │
--   │   PK: username          │◄───────────────────────────│   PK: tracking_id   │
--   └──────────┬──────────────┘  FK: creator_username      └─────────────────────┘
--              │
--              │ FK: username
--              │
--   ┌──────────┴──────────────────────┐
--   │                                 │
--   ▼                                 ▼
--   ┌─────────────────────────┐  ┌─────────────────────────┐
--   │        SESSIONS         │  │     PASSWORD_RESETS     │
--   │   PK: session_id        │  │   PK: reset_id          │
--   │   FK: username          │  │   FK: username          │
--   └─────────────────────────┘  └─────────────────────────┘
--

-- ═══════════════════════════════════════════════════════════════════════════════
