const db = require('./backend/src/config/db');
async function check() {
    try {
        const res = await db.query("SELECT column_name FROM information_schema.columns WHERE table_name = 'shipments' ORDER BY column_name");
        res.rows.forEach(r => console.log(r.column_name));
        process.exit(0);
    } catch (err) {
        console.error(err);
        process.exit(1);
    }
}
check();
