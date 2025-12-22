-- Enable Row Level Security for Shipments
ALTER TABLE shipments ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all access to service_role (used by MoveX Backend)
-- This ensures the existing Node.js app functionality remains unbroken.
CREATE POLICY "Enable access for service_role" ON shipments
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Policy: Allow authenticated users to view shipments related to their organization
-- (Optional: Add this if you plan to use Supabase Client on the frontend)
/*
CREATE POLICY "Users can view organizational shipments" ON shipments
    FOR SELECT
    TO authenticated
    USING (organization_id IN (
        SELECT organization_id FROM users WHERE id = auth.uid()::text::bigint
    ));
*/
