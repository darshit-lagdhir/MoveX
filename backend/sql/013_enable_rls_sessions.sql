-- Enable Row Level Security for Sessions
-- Sessions table stores authentication tokens and is accessed only by the backend.
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

-- Policy: Allow all access to service_role (used by MoveX Backend)
-- The backend uses service_role credentials to manage sessions.
-- This ensures login/logout and session validation works correctly.
CREATE POLICY "Enable access for service_role" ON sessions
    FOR ALL
    TO service_role
    USING (true)
    WITH CHECK (true);

-- Note: Sessions table should NEVER be accessible from frontend/anon key.
-- All session operations go through the backend API.
