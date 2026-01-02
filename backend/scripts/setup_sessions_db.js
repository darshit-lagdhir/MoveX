const pool = require('../src/config/db');

async function setupSessionsTable() {
    try {
        console.log('Creating sessions table...');

        await pool.query(`
            CREATE TABLE IF NOT EXISTS sessions (
                id VARCHAR(255) PRIMARY KEY,
                user_id INTEGER,
                role VARCHAR(255),
                email VARCHAR(255),
                created_at BIGINT,
                expires_at BIGINT,
                last_accessed_at BIGINT
            );
        `);

        console.log('Sessions table created successfully.');
    } catch (err) {
        console.error('Error creating sessions table:', err);
    } finally {
        // We don't close pool here because it might be used by app, 
        // but since this is a script, we should probably exit
        process.exit(0);
    }
}

setupSessionsTable();
