-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE shipment_photos ENABLE ROW LEVEL SECURITY;

-- Create Policy: Allow all access to service_role (Backend)
-- This ensures your Node.js app (using service key/db url) works fine.
-- Note: 'postgres' and 'service_role' users naturally bypass RLS, 
-- but explicit policies are good documentation.

CREATE POLICY "Enable access for service_role" ON users
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for service_role" ON organizations
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Enable access for service_role" ON shipment_photos
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- OPTIONAL: If you use Supabase Client on Frontend with Anon Key
-- You would need policies like:
-- CREATE POLICY "Users can see own profile" ON users FOR SELECT USING (auth.uid() = id);
