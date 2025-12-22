-- Create shipments table
CREATE TABLE IF NOT EXISTS shipments (
    id BIGSERIAL PRIMARY KEY,
    tracking_id VARCHAR(50) UNIQUE NOT NULL,
    sender_name VARCHAR(100),
    receiver_name VARCHAR(100),
    origin_address TEXT,
    destination_address TEXT,
    status VARCHAR(50) DEFAULT 'pending', -- pending, in_transit, delivered, failed
    current_location VARCHAR(100),
    estimated_delivery TIMESTAMPTZ,
    price DECIMAL(10, 2) DEFAULT 0.00,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    user_id BIGINT REFERENCES users(id),
    organization_id BIGINT REFERENCES organizations(id)
);

CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_id);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
