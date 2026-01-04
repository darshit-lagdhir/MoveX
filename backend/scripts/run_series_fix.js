const pool = require('../src/config/db');
const fs = require('fs');
const path = require('path');

async function runFix() {
    console.log('--- Starting Series Realignment Fix ---');
    const sql = fs.readFileSync(path.join(__dirname, '../sql/016_series_fix.sql'), 'utf8');

    try {
        await pool.query(sql);
        console.log('✅ Success: All IDs are now in a clean series (1, 2, 3...) and Sessions table is optimized.');
    } catch (err) {
        console.error('❌ Fix failed:', err.message);
        process.exit(1);
    } finally {
        await pool.end();
    }
}

runFix();
