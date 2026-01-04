-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX: Franchise enhancements (Full Address, Non-Serviceable Areas)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Add full_address column
ALTER TABLE public.organizations ADD COLUMN IF NOT EXISTS full_address TEXT;

-- 2. Handle rename of service_area to non_serviceable_areas
-- First check if the new column exists, if not rename the old one
DO $$ 
BEGIN 
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='organizations' AND column_name='non_serviceable_areas') THEN
        ALTER TABLE public.organizations RENAME COLUMN service_area TO non_serviceable_areas;
    END IF;
END $$;

-- 3. Ensure pincodes is available (already exists but for clarity)
-- We'll keep it as TEXT but we will treat it as a comma-separated list in code.
