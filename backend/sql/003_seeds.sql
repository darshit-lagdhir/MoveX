-- ═══════════════════════════════════════════════════════════════════════════════
-- MoveX Seed Data
-- ═══════════════════════════════════════════════════════════════════════════════



-- 2. Create Default HQ Organization (if not exists)
INSERT INTO organizations (name, type, status, full_address)
VALUES ('MoveX HQ', 'admin', 'active', 'Main Headquarters, Mumbai')
ON CONFLICT DO NOTHING;
