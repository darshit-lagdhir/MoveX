require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const { Pool } = require('pg');
const path = require('path');

const poolConfig = process.env.DATABASE_URL
    ? {
        connectionString: process.env.DATABASE_URL,
        ssl: process.env.DATABASE_URL.includes('sslmode=require') ? { rejectUnauthorized: false } : false
    }
    : {
        user: process.env.DB_USER,
        host: process.env.DB_HOST,
        database: process.env.DB_NAME,
        password: process.env.DB_PASSWORD,
        port: process.env.DB_PORT,
    };

const pool = new Pool(poolConfig);

async function migrate() {
    const client = await pool.connect();
    try {
        console.log('Starting Schema Migration to V2...');
        await client.query('BEGIN');

        // 1. Create Organizations Table
        console.log('Creating organizations table...');
        await client.query(`
            CREATE TABLE IF NOT EXISTS organizations (
                id BIGSERIAL PRIMARY KEY,
                name TEXT NOT NULL,
                type TEXT NOT NULL DEFAULT 'franchise', -- internal, franchise, hub
                service_area TEXT,
                status TEXT NOT NULL DEFAULT 'active', -- active, suspended
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            );
        `);

        // 2. Add Missing Columns to Users Table
        console.log('Updating users table schema...');

        const alterUserQueries = [
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name TEXT;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS phone TEXT;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS organization_id BIGINT REFERENCES organizations(id);`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS mfa_enabled BOOLEAN DEFAULT FALSE;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS oauth_provider TEXT;`, // google, github, etc.
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS last_login_at TIMESTAMPTZ;`,
            `ALTER TABLE users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();`
        ];

        for (const query of alterUserQueries) {
            await client.query(query);
        }

        // 3. Create Default Organization (Check if exists first)
        const orgRes = await client.query("SELECT id FROM organizations WHERE name = 'MoveX HQ'");
        let hqId;
        if (orgRes.rows.length === 0) {
            console.log('Creating default HQ organization...');
            const insertOrg = await client.query(`
                INSERT INTO organizations (name, type, service_area, status)
                VALUES ('MoveX HQ', 'internal', 'Global', 'active')
                RETURNING id;
            `);
            hqId = insertOrg.rows[0].id;
        } else {
            hqId = orgRes.rows[0].id;
        }

        // 4. Update Admin user to belong to HQ (Optional fix for existing admin)
        await client.query(`
            UPDATE users SET organization_id = $1, full_name = 'System Administrator' 
            WHERE role = 'admin' AND organization_id IS NULL
        `, [hqId]);

        await client.query('COMMIT');
        console.log('Schema Migration V2 Successful!');
    } catch (err) {
        await client.query('ROLLBACK');
        console.error('Migration failed:', err);
    } finally {
        client.release();
        await pool.end();
    }
}

migrate();
