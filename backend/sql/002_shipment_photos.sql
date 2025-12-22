-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Database Migration: Shipment Photos Table
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- Purpose: Track photo uploads for shipments
-- Storage: Actual photos stored in Supabase Storage, this table stores metadata
--
-- Run this in your Supabase SQL Editor after creating the storage bucket
-- ═══════════════════════════════════════════════════════════════════════════════

-- Create shipment_photos table if it doesn't exist
CREATE TABLE IF NOT EXISTS shipment_photos (
    id BIGSERIAL PRIMARY KEY,
    
    -- Reference to the shipment (by tracking ID)
    tracking_id VARCHAR(50) NOT NULL,
    
    -- Photo metadata
    photo_type VARCHAR(50) NOT NULL,
    -- Types: 'pickup', 'delivery', 'signature', 'damage', 'pod', 'other'
    
    storage_path TEXT NOT NULL,
    -- Path in Supabase Storage: {tracking_id}/{timestamp}_{type}.{ext}
    
    -- Upload info
    uploaded_by BIGINT REFERENCES users(id) ON DELETE SET NULL,
    uploaded_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- File metadata (optional but useful)
    file_size INTEGER,
    mime_type VARCHAR(100),
    
    -- Soft delete support
    deleted_at TIMESTAMPTZ
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_shipment_photos_tracking 
    ON shipment_photos(tracking_id);

CREATE INDEX IF NOT EXISTS idx_shipment_photos_type 
    ON shipment_photos(tracking_id, photo_type);

CREATE INDEX IF NOT EXISTS idx_shipment_photos_uploaded 
    ON shipment_photos(uploaded_at DESC);

-- Only show non-deleted photos by default
CREATE INDEX IF NOT EXISTS idx_shipment_photos_active 
    ON shipment_photos(tracking_id) 
    WHERE deleted_at IS NULL;

-- Comments for documentation
COMMENT ON TABLE shipment_photos IS 'Stores metadata for shipment photos. Actual files in Supabase Storage.';
COMMENT ON COLUMN shipment_photos.storage_path IS 'Path in Supabase Storage bucket (e.g., MX29801/1703251200000_pickup.jpg)';
COMMENT ON COLUMN shipment_photos.photo_type IS 'Type of photo: pickup, delivery, signature, damage, pod, other';
