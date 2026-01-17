-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Database Migration - Make tracking_id PRIMARY KEY
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- This migration changes shipments table:
-- - Removes 'id' as PRIMARY KEY
-- - Makes 'tracking_id' the PRIMARY KEY
-- 
-- ═══════════════════════════════════════════════════════════════════════════════

-- STEP 1: Drop existing primary key constraint
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_pkey;

-- STEP 2: Drop the unique constraint on tracking_id (will be replaced by PK)
ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_tracking_id_key;

-- STEP 3: Make tracking_id the PRIMARY KEY
ALTER TABLE shipments ADD CONSTRAINT shipments_pkey PRIMARY KEY (tracking_id);

-- STEP 4: Keep id column but remove NOT NULL if needed (optional - can keep for internal use)
-- The id column will still auto-increment but won't be the primary key

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Check the new structure
-- ═══════════════════════════════════════════════════════════════════════════════

-- Run this to verify:
/*
SELECT 
    c.column_name,
    c.data_type,
    CASE WHEN pk.column_name IS NOT NULL THEN 'PRIMARY KEY' ELSE '' END as is_pk,
    CASE WHEN u.column_name IS NOT NULL THEN 'UNIQUE' ELSE '' END as is_unique
FROM information_schema.columns c
LEFT JOIN (
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'shipments' AND tc.constraint_type = 'PRIMARY KEY'
) pk ON c.column_name = pk.column_name
LEFT JOIN (
    SELECT kcu.column_name
    FROM information_schema.table_constraints tc
    JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
    WHERE tc.table_name = 'shipments' AND tc.constraint_type = 'UNIQUE'
) u ON c.column_name = u.column_name
WHERE c.table_name = 'shipments'
ORDER BY c.ordinal_position;
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULT:
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- tracking_id is now PRIMARY KEY
-- id column still exists (auto-increment) but is no longer the primary key
--
-- ═══════════════════════════════════════════════════════════════════════════════
