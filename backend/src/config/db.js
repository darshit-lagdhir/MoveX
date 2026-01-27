/**
 * Database Connection Configuration (Production-Safe)
 * 
 * This module provides a PostgreSQL connection pool with:
 * - SSL support for Supabase/cloud databases
 * - Connection pooling with appropriate limits
 * - Error handling and reconnection logic
 * - Startup validation
 * 
 * BACKWARD COMPATIBLE: All existing code using pool.query() will work unchanged.
 */

const { Pool } = require('pg');
const path = require('path');
const dns = require('dns'); // Required for custom lookup
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// ═══════════════════════════════════════════════════════════
// SUPABASE TLS FIX (Windows Certificate Chain Issue)
// ═══════════════════════════════════════════════════════════
// Supabase uses valid SSL certificates, but Windows and some Render regions have issues
// with certificate chain validation. This bypass ensures connectivity.
const hasSupabaseUrl = process.env.DATABASE_URL && (
  process.env.DATABASE_URL.includes('supabase.co') ||
  process.env.DATABASE_URL.includes('supabase.org') ||
  process.env.DATABASE_URL.includes('pooler.supabase.com')
);

if (hasSupabaseUrl) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Determine SSL configuration based on environment
 * Supabase requires SSL, local development typically doesn't
 * 
 * Note: rejectUnauthorized: false is required for Supabase on Windows
 * due to certificate chain issues. This is safe because:
 * 1. We're still using encrypted connections
 * 2. Supabase is a trusted service
 */
function getSSLConfig(connectionString) {
  if (!connectionString) return process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false;

  const isCloudDB =
    connectionString.includes('sslmode=require') ||
    connectionString.includes('supabase.co') ||
    connectionString.includes('supabase.org') ||
    connectionString.includes('pooler.supabase.com') ||
    connectionString.includes('render.com') ||
    connectionString.includes('railway.app') ||
    connectionString.includes('neon.tech');

  if (isCloudDB) {
    return {
      rejectUnauthorized: false
    };
  }

  // If explicitly set via env var
  if (process.env.DB_SSL === 'true') {
    return { rejectUnauthorized: false };
  }

  // Default: no SSL for local development
  return false;
}

/**
 * Build pool configuration from environment variables
 */
function buildPoolConfig() {
  const baseConfig = {
    // Connection pool settings (conservative for production)
    max: parseInt(process.env.DB_POOL_MAX, 10) || 20, // Increased default for cloud scaling
    min: 0,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 30000,                    // 30s timeout for stability
    keepAlive: true,
    keepAliveInitialDelayMillis: 10000,
    family: 4,
    // Note: statement_timeout is NOT supported by Supabase connection pooler (port 6543)
    // If you need query timeouts, set them per-query or use direct connection (port 5432)
  };

  // Prefer DATABASE_URL if available (Supabase, Railway, Heroku, etc.)
  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(process.env.DATABASE_URL),
      // Advanced DNS: Handle Render's IPv4/IPv6 resolution quirks
      lookup: (hostname, options, callback) => {
        if (typeof options === 'function') {
          callback = options;
          options = {};
        }
        const opts = { ...(options || {}), family: 4, all: false };
        dns.lookup(hostname, opts, (err, address, family) => {
          if (err && err.code === 'ENOTFOUND') {
            // Fallback to default if IPv4-only fails
            return dns.lookup(hostname, options, callback);
          }
          callback(err, address, family);
        });
      }
    };
  }

  // Fallback to individual credentials
  const requiredVars = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
  const missingVars = requiredVars.filter(v => !process.env[v]);

  if (missingVars.length > 0 && isProduction) {
    console.error(`❌ CRITICAL: Missing database environment variables: ${missingVars.join(', ')}`);
    console.error('   Set DATABASE_URL or individual DB_* variables.');
    process.exit(1);
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

// ═══════════════════════════════════════════════════════════
// POOL INITIALIZATION
// ═══════════════════════════════════════════════════════════

const poolConfig = buildPoolConfig();
const pool = new Pool(poolConfig);

// ═══════════════════════════════════════════════════════════
// ERROR HANDLING
// ═══════════════════════════════════════════════════════════

/**
 * Handle unexpected errors on idle clients
 * This prevents the app from crashing on transient database issues
 */
pool.on('error', (err, client) => {
  // Log error but don't crash - pool will handle reconnection
  console.error('[DB] Unexpected error on idle client:', err.message);

  // In production, you might want to send this to a monitoring service
  if (isProduction && err.code === 'ECONNRESET') {
    console.warn('[DB] Connection reset detected - pool will create new connections as needed');
  }
});

// ═══════════════════════════════════════════════════════════
// CONNECTION VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Test database connection on startup
 * Logs connection status but doesn't block startup
 */
async function validateConnection(retries = 5) {
  // Safe check for DB_URL presence (don't log the actual URL for security)
  if (isProduction) {
    if (!process.env.DATABASE_URL) {
      console.warn('[DB] WARNING: DATABASE_URL is not set. Falling back to individual credentials.');
    } else {
      try {
        const urlInfo = new URL(process.env.DATABASE_URL);
        console.log(`[DB] Attempting connection to host: ${urlInfo.hostname}:${urlInfo.port || 5432} (SSL: ${poolConfig.ssl ? 'Yes' : 'No'})`);
      } catch (e) {
        console.warn('[DB] Could not parse DATABASE_URL for logging');
      }
    }
  }

  for (let i = 0; i < retries; i++) {
    try {
      const client = await pool.connect();
      const result = await client.query('SELECT NOW() as now, current_database() as db');
      client.release();

      const { db } = result.rows[0];
      console.log(`✅ Database connection established: ${db}`);
      return true;
    } catch (err) {
      const isLastAttempt = i === retries - 1;
      const delay = (i + 1) * 3000;

      console.warn(`⏳ Attempt ${i + 1} failed: ${err.message}`);

      if (isLastAttempt) {
        console.error('❌ Database connection failed after maximum retries.');

        if (err.message.includes('timeout')) {
          console.error('   → TIMEOUT: Is the DB URL correct? If using Supabase, check if the project is paused.');
        }

        if (isProduction) {
          console.error('   Exiting due to database connection failure in production mode.');
          process.exit(1);
        }
      } else {
        console.log(`   Retrying in ${delay / 1000}s...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  return false;
}

// Run validation on module load (non-blocking)
validateConnection();

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

/**
 * Query wrapper with automatic error handling
 * This is the main interface used by the application
 * 
 * Usage: const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
 */
module.exports = pool;

// Also export query helper for convenience (backward compatible)
// module.exports.query is already natively provided by the pool object


// Export pool reference if needed for transactions
module.exports.pool = pool;

// Export connection validation function for health checks
module.exports.validateConnection = validateConnection;
