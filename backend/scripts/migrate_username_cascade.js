const pool = require('../db');

async function run() {
    try {
        console.log("Adding ON UPDATE CASCADE to username foreign keys...");

        await pool.query('BEGIN');

        // 1. Shipments
        await pool.query('ALTER TABLE shipments DROP CONSTRAINT IF EXISTS shipments_username_fkey');
        await pool.query('ALTER TABLE shipments ADD CONSTRAINT shipments_username_fkey FOREIGN KEY (creator_username) REFERENCES users(username) ON UPDATE CASCADE');

        // 2. Password Resets
        await pool.query('ALTER TABLE password_resets DROP CONSTRAINT IF EXISTS password_resets_username_fkey');
        await pool.query('ALTER TABLE password_resets ADD CONSTRAINT password_resets_username_fkey FOREIGN KEY (username) REFERENCES users(username) ON DELETE CASCADE ON UPDATE CASCADE');

        // 3. Sessions
        await pool.query('ALTER TABLE sessions DROP CONSTRAINT IF EXISTS sessions_username_fkey');
        await pool.query('ALTER TABLE sessions ADD CONSTRAINT sessions_username_fkey FOREIGN KEY (username) REFERENCES users(username) ON UPDATE CASCADE ON DELETE CASCADE');

        await pool.query('COMMIT');
        console.log("Migration successful: Username updates will now cascade.");
    } catch (err) {
        await pool.query('ROLLBACK');
        console.error("Migration failed:", err);
    } finally {
        await pool.pool.end();
    }
}

run();
