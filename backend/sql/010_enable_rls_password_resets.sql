-- Enable RLS on password_resets
ALTER TABLE password_resets ENABLE ROW LEVEL SECURITY;

-- Service role access
CREATE POLICY "Enable access for service_role" ON password_resets
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);
