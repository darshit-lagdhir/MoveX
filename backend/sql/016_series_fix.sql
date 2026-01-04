-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX: Final Polish & "Series Manner" Realignment
-- ═══════════════════════════════════════════════════════════════════════════════

-- 1. Correct Users ID Series (1, 2, 3...)
-- Since we use username as PK for relations, changing ID is safe.
CREATE TEMP TABLE user_id_fix AS 
SELECT username, row_number() OVER (ORDER BY id) as new_id 
FROM public.users;

UPDATE public.users u
SET id = f.new_id
FROM user_id_fix f
WHERE u.username = f.username;

-- Reset sequence for next user
SELECT setval(pg_get_serial_sequence('public.users', 'id'), COALESCE((SELECT MAX(id) FROM public.users), 1));


-- 2. Optimize Sessions Table Layout
-- We'll recreate it to get the column order perfect for the Supabase UI
CREATE TABLE public.sessions_new (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255),
    role VARCHAR(50),
    token VARCHAR(255) UNIQUE,
    created_at BIGINT,
    expires_at BIGINT,
    last_accessed_at BIGINT
);

-- Copy data
INSERT INTO public.sessions_new (username, role, token, created_at, expires_at, last_accessed_at)
SELECT username, role, token, created_at, expires_at, last_accessed_at
FROM public.sessions
ORDER BY id;

-- Swap tables
DROP TABLE public.sessions;
ALTER TABLE public.sessions_new RENAME TO sessions;


-- 3. Cleanup Organizations ID (Optional but aligns with "Series manner")
-- Need to update foreign keys first
CREATE TEMP TABLE org_id_fix AS 
SELECT id as old_id, row_number() OVER (ORDER BY id) as new_id 
FROM public.organizations;

-- Update referencing tables
UPDATE public.users u SET organization_id = f.new_id FROM org_id_fix f WHERE u.organization_id = f.old_id;
UPDATE public.shipments s SET organization_id = f.new_id FROM org_id_fix f WHERE s.organization_id = f.old_id;

-- Update organization table itself
UPDATE public.organizations o SET id = f.new_id FROM org_id_fix f WHERE o.id = f.old_id;

-- Reset sequence
SELECT setval(pg_get_serial_sequence('public.organizations', 'id'), COALESCE((SELECT MAX(id) FROM public.organizations), 1));


-- 4. Enable RLS for the new sessions table
ALTER TABLE public.sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Enable access for service_role" ON public.sessions FOR ALL TO service_role USING (true) WITH CHECK (true);
