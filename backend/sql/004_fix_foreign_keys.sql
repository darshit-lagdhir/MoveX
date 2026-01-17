-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Database Migration - Fix Foreign Keys
-- Run this in Supabase SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════════
-- 
-- This migration fixes incomplete foreign key constraints in:
-- 1. shipments.organization_id - Add ON UPDATE CASCADE ON DELETE SET NULL
-- 2. shipments.creator_username - Add ON DELETE SET NULL
--
-- ═══════════════════════════════════════════════════════════════════════════════

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 1: Fix shipments.organization_id Foreign Key
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing constraint
ALTER TABLE shipments 
DROP CONSTRAINT IF EXISTS shipments_organization_id_fkey;

-- Recreate with proper ON UPDATE CASCADE ON DELETE SET NULL
ALTER TABLE shipments 
ADD CONSTRAINT shipments_organization_id_fkey 
FOREIGN KEY (organization_id) 
REFERENCES organizations(id) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- STEP 2: Fix shipments.creator_username Foreign Key
-- ═══════════════════════════════════════════════════════════════════════════════

-- Drop existing constraint
ALTER TABLE shipments 
DROP CONSTRAINT IF EXISTS shipments_username_fkey;

-- Recreate with proper ON DELETE SET NULL
ALTER TABLE shipments 
ADD CONSTRAINT shipments_creator_username_fkey 
FOREIGN KEY (creator_username) 
REFERENCES users(username) 
ON UPDATE CASCADE 
ON DELETE SET NULL;

-- ═══════════════════════════════════════════════════════════════════════════════
-- VERIFICATION: Check all foreign keys are correct
-- ═══════════════════════════════════════════════════════════════════════════════

-- Run this query to verify all foreign keys:
/*
SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
    JOIN information_schema.referential_constraints AS rc
      ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name;
*/

-- ═══════════════════════════════════════════════════════════════════════════════
-- EXPECTED RESULT AFTER MIGRATION:
-- ═══════════════════════════════════════════════════════════════════════════════
--
-- TABLE              COLUMN              REFERENCES              ON UPDATE    ON DELETE
-- ─────────────────────────────────────────────────────────────────────────────────────
-- users              organization_id     organizations(id)       NO ACTION    SET NULL
-- sessions           username            users(username)         CASCADE      CASCADE
-- password_resets    username            users(username)         CASCADE      CASCADE
-- shipments          creator_username    users(username)         CASCADE      SET NULL
-- shipments          organization_id     organizations(id)       CASCADE      SET NULL
--
-- ═══════════════════════════════════════════════════════════════════════════════
