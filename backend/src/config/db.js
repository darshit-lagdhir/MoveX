/**
 * Database Connection Configuration (Production-Safe)
 * Optimized for Render + Supabase
 */

const { Pool } = require('pg');
const path = require('path');
const dns = require('dns');
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// FORCE IPv4 globally for this project (Fixes Render/Supabase ENETUNREACH)
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) { }

// SUPABASE SSL FIX
const hasSupabaseUrl = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('supabase') ||
  process.env.DATABASE_URL.includes('pooler')
);

if (hasSupabaseUrl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const isProduction = process.env.NODE_ENV === 'production';

function getSSLConfig(connectionString) {
  if (!connectionString) return process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  // Always use SSL for cloud databases
  const cloudProviders = ['supabase', 'pooler', 'render', 'railway', 'neon', 'sslmode=require'];
  if (cloudProviders.some(p => connectionString.includes(p))) {
    return { rejectUnauthorized: false };
  }
  return process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;
}

function buildPoolConfig() {
  const baseConfig = {
    max: 5,  // Strict limit for Session Mode (5432) to prevent "Too many clients"
    min: 0,  // Scale to zero to release unrestricted connections
    idleTimeoutMillis: 3000,
    connectionTimeoutMillis: 15000, // Give it a bit more time to handshake on 5432
    allowExitOnIdle: true,
    keepAlive: true,
    family: 4
  };


  if (process.env.DATABASE_URL) {
    let connectionString = process.env.DATABASE_URL;

    // NOTE: Reverted auto-switch to 6543 (Transaction Mode) as it caused 'Connection terminated unexpectedly'
    // with node-postgres prepared statements.
    // We are sticking to 5432 (Session Mode) but using strict pooling (max: 5, min: 0) to handle serverless limits.
    if (connectionString.includes('supabase.com') && connectionString.includes('6543')) {
      console.log('🔧 Reverting Supabase port 6543 -> 5432 (Session Mode) for compatibility');
      connectionString = connectionString.replace(':6543', ':5432');
    }

    return {
      ...baseConfig,
      connectionString: connectionString,
      ssl: getSSLConfig(connectionString)
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

const poolConfig = buildPoolConfig();
const pool = new Pool(poolConfig);

pool.on('error', (err) => {
  console.error('[DB] Unexpected pool error:', err.message);
});

async function validateConnection(retries = 5) {


  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW()');
      client.release();
      console.log('✅ Database connected successfully.');
      return true;
    } catch (err) {
      console.warn(`⏳ Attempt ${i + 1} failed: ${err.message}`);
      if (i === retries - 1) {
        console.error('❌ Connection failed after 5 attempts.');
        if (isProduction) process.exit(1);
      } else {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }
  return false;
}

validateConnection();

module.exports = pool;
module.exports.pool = pool;
module.exports.validateConnection = validateConnection;
