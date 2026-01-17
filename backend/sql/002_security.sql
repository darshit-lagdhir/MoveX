-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Security Policies (RLS)
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Enable RLS on all tables (6 tables - shipment_photos removed)
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;
ALTER TABLE serviceable_cities ENABLE ROW LEVEL SECURITY;

-- 2. Define Service Role Policy (Unrestricted Access for Backend)
-- This allows your Node.js application (connected via service role) to function fully.

DO $$ 
DECLARE 
    tables TEXT[] := ARRAY['users', 'organizations', 'sessions', 'password_resets', 'shipments', 'serviceable_cities'];
    tbl TEXT;
BEGIN
    FOREACH tbl IN ARRAY tables LOOP
        EXECUTE format('
            DROP POLICY IF EXISTS "Enable access for service_role" ON %I;
            CREATE POLICY "Enable access for service_role" ON %I
                FOR ALL
                TO service_role
                USING (true)
                WITH CHECK (true);
        ', tbl, tbl);
    END LOOP;
END $$;

-- 3. Public Read Policies (for Frontend Client)

-- Allow anyone to read the list of supported cities
DROP POLICY IF EXISTS "Enable public read access" ON serviceable_cities;
CREATE POLICY "Enable public read access" ON serviceable_cities
    FOR SELECT
    TO anon, authenticated
    USING (true);

-- Optional: Allow users to read their own profile (if using Supabase Client)
-- CREATE POLICY "Users can see own profile" ON users FOR SELECT USING (auth.uid() = id);
