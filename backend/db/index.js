require('dotenv').config();
const { Pool } = require('pg');

const pool = new Pool({
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL?.includes('sslmode=require') ? { rejectUnauthorized: false } : false
});

pool.on('error', (err) => {
        console.error('[DB] Unexpected error on idle client', err);
});

module.exports = {
        query: (text, params) => pool.query(text, params),
        pool,
};