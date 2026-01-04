const pool = require('../src/config/db');
const fs = require('fs');

async function diagnose() {
    let out = '--- Diagnosing Database Issues ---\n';
    try {
        const users = await pool.query('SELECT username, id, created_at FROM users ORDER BY id');
        out += '\nUsers Table:\n' + JSON.stringify(users.rows, null, 2);

        const sessions = await pool.query('SELECT * FROM sessions LIMIT 5');
        out += '\n\nSessions Table (first 5):\n' + JSON.stringify(sessions.rows, null, 2);

        const tableInfo = await pool.query(`
            SELECT table_name, column_name, data_type, ordinal_position
            FROM information_schema.columns 
            WHERE table_name IN ('users', 'sessions')
            ORDER BY table_name, ordinal_position
        `);
        out += '\n\nSchema Info:\n' + JSON.stringify(tableInfo.rows, null, 2);

        fs.writeFileSync('diagnosis_data.json', out);
        console.log('Diagnosis written to diagnosis_data.json');
    } catch (err) {
        console.error('Diagnosis failed:', err.message);
    } finally {
        await pool.end();
    }
}

diagnose();
