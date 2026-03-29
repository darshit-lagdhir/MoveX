/**
 * Database Connection Configuration (Supabase/PostgreSQL)
 * Simple configuration for local operation connecting to Supabase.
 */

const { Pool } = require('pg');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// FORCE BYPASS for Supabase/Self-signed SSL errors during exams
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

/**
 * Configure SSL for Supabase/Cloud Databases
 */
function getSSLConfig(connectionString) {
  if (process.env.DB_SSL === 'true') {
    return { rejectUnauthorized: false };
  }

  if (!connectionString) return false;

  const cloudProviders = ['supabase', 'pooler', 'render', 'railway', 'neon', 'sslmode=require', 'aiven'];
  if (cloudProviders.some(p => connectionString.toLowerCase().includes(p))) {
    return { rejectUnauthorized: false };
  }
  return false;
}

/**
 * Build Database Connection Pool
 */
function buildPoolConfig() {
  const baseConfig = {
    max: 5,
    min: 0,
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 15000,
    allowExitOnIdle: true,
    keepAlive: true,
    family: 4
  };

  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(process.env.DATABASE_URL)
    };
  }

  return {
    ...baseConfig,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT, 10) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'movex_auth',
    ssl: getSSLConfig(null)
  };
}

const pool = new Pool(buildPoolConfig());

pool.on('error', (err) => {
  console.error('[DB] Database error:', err.message);
});

/**
 * Simple connection test
 */
async function validateConnection() {
  try {
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();
    console.log('✅ Database connected.');
    return true;
  } catch (err) {
    console.error(`❌ Connection failed: ${err.message}`);
    return false;
  }
}

validateConnection();

module.exports = pool;
module.exports.pool = pool;
module.exports.validateConnection = validateConnection;

