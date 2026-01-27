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
    max: 10, // Reduced from 20 -> 10 for Supabase Transaction Mode compatibility
    min: 0,  // Allow pool to scale down to 0 to prevent holding stale connections
    idleTimeoutMillis: 5000, // Disconnect idle clients after 5 seconds
    connectionTimeoutMillis: 10000, // Fail fast (10s) to avoid hanging requests
    allowExitOnIdle: true,
    keepAlive: true,
    family: 4
  };

  if (process.env.DATABASE_URL) {
    let connectionString = process.env.DATABASE_URL;

    // AUTO-FIX: Switch Supabase Pooler port from 5432 to 6543 (Transaction Mode) to prevent timeouts
    if (connectionString.includes('supabase.com') && connectionString.includes('5432')) {
      console.log('🔧 Auto-switching Supabase port 5432 -> 6543 (Transaction Mode) for stability');
      connectionString = connectionString.replace(':5432', ':6543');
    }

    // DEBUG: Log the actual connection string parameters (masked)
    try {
      const dbUrl = new URL(connectionString);
      console.log(`[DB Config] Connecting to Host: ${dbUrl.hostname}, Port: ${dbUrl.port}, User: ${dbUrl.username}`);
    } catch (e) { console.log('[DB Config] Could not parse connection string for logging'); }

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
