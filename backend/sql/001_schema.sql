-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Database Schema (Simplified for Exam)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. ENUMS (Simplified)
DO $$ BEGIN
    CREATE TYPE user_role AS ENUM ('admin', 'franchisee', 'staff', 'user');
EXCEPTION
    WHEN duplicate_object THEN NULL;
END $$;

-- 2. ORGANIZATIONS
CREATE TABLE IF NOT EXISTS organizations (
    organization_id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT DEFAULT 'franchise',
    status TEXT DEFAULT 'active',
    pincodes TEXT,
    full_address TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 3. USERS
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    role user_role DEFAULT 'user',
    status TEXT DEFAULT 'active',
    organization_id INTEGER REFERENCES organizations(organization_id) ON DELETE SET NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 4. SHIPMENTS
CREATE TABLE IF NOT EXISTS shipments (
    shipment_id SERIAL PRIMARY KEY,
    tracking_id VARCHAR(50), -- Example: MX001
    status VARCHAR(50) DEFAULT 'pending',
    
    -- Sender
    sender_name VARCHAR(100),
    sender_phone VARCHAR(20),
    sender_address TEXT,
    sender_pincode VARCHAR(10),
    
    -- Receiver
    receiver_name VARCHAR(100),
    receiver_phone VARCHAR(20),
    receiver_address TEXT,
    receiver_pincode VARCHAR(10),
    
    -- Shipment details
    origin_address TEXT,
    destination_address TEXT,
    weight NUMERIC(10,2) DEFAULT 1.0,
    price NUMERIC(10,2) DEFAULT 0.00,
    contents TEXT,
    
    -- Assignment
    creator_username VARCHAR(255) REFERENCES users(username) ON DELETE SET NULL,
    organization_id INTEGER REFERENCES organizations(organization_id) ON DELETE SET NULL,
    assigned_staff_id INTEGER REFERENCES users(user_id) ON DELETE SET NULL,
    
    -- Timestamps
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
