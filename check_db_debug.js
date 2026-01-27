const pool = require('./backend/src/config/db');
async function checkSchema() {
    try {
        const users = await pool.query("SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'users' ORDER BY table_schema, ordinal_position");
        console.log('---USERS---');
        users.rows.forEach(r => console.log(`${r.table_schema}.${r.table_name}.${r.column_name}: ${r.data_type}`));

        const sessions = await pool.query("SELECT table_schema, table_name, column_name, data_type FROM information_schema.columns WHERE table_name = 'sessions' ORDER BY table_schema, ordinal_position");
        console.log('---SESSIONS---');
        sessions.rows.forEach(r => console.log(`${r.table_schema}.${r.table_name}.${r.column_name}: ${r.data_type}`));

        const userCount = await pool.query("SELECT COUNT(*) FROM users");
        console.log('COUNT:', userCount.rows[0].count);

    } catch (err) {
        console.error('ERROR:', err.message);
    } finally {
        process.exit();
    }
}
checkSchema();
