const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runMigration() {
    console.log('--- Starting Primary Key Shift Migration ---');
    const sql = fs.readFileSync(path.join(__dirname, '../sql/015_pk_shift.sql'), 'utf8');

    try {
        await pool.query(sql);
        console.log('✅ Migration successful: Primary Key is now username, Session IDs are sequential.');
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runMigration();
