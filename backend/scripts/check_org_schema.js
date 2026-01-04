const pool = require('../src/config/db');
const fs = require('fs');

async function checkOrgSchema() {
    try {
        const tableInfo = await pool.query(`
            SELECT column_name, data_type 
            FROM information_schema.columns 
            WHERE table_name = 'organizations'
            ORDER BY ordinal_position
        `);
        fs.writeFileSync('org_schema.json', JSON.stringify(tableInfo.rows, null, 2));
    } catch (err) {
        console.error('Schema check failed:', err.message);
    } finally {
        await pool.end();
    }
}

checkOrgSchema();
