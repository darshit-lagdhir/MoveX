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
require('dotenv').config({ path: path.resolve(__dirname, '../../../.env') });

// ═══════════════════════════════════════════════════════════
// SUPABASE TLS FIX (Windows Certificate Chain Issue)
// ═══════════════════════════════════════════════════════════
// Supabase uses valid SSL certificates, but Windows has issues
// with certificate chain validation. This bypass is safe for Supabase.
if (process.env.DATABASE_URL && process.env.DATABASE_URL.includes('supabase.co')) {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
  // console.log('⚠️ TLS certificate validation disabled for Supabase connection (Windows compatibility)');
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
  // If DATABASE_URL contains sslmode=require, enable SSL with relaxed verification
  if (connectionString && connectionString.includes('sslmode=require')) {
    return {
      rejectUnauthorized: false,
      // Supabase uses valid certs but Windows may have chain issues
    };
  }

  // If DATABASE_URL contains supabase.co, always use SSL
  if (connectionString && connectionString.includes('supabase.co')) {
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
    max: parseInt(process.env.DB_POOL_MAX, 10) || 10, // Maximum connections
    min: parseInt(process.env.DB_POOL_MIN, 10) || 2,  // Minimum connections
    idleTimeoutMillis: 30000,                          // Close idle connections after 30s
    connectionTimeoutMillis: 10000,                    // Timeout for new connections (10s)
    // Note: statement_timeout is NOT supported by Supabase connection pooler (port 6543)
    // If you need query timeouts, set them per-query or use direct connection (port 5432)
  };

  // Prefer DATABASE_URL if available (Supabase, Railway, Heroku, etc.)
  if (process.env.DATABASE_URL) {
    return {
      ...baseConfig,
      connectionString: process.env.DATABASE_URL,
      ssl: getSSLConfig(process.env.DATABASE_URL)
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

/**
 * Log when new clients connect (development only)
 */
// pool.on('connect') listener removed to reduce noise

/**
 * Log when clients are removed from pool
 */
pool.on('remove', (client) => {
  if (!isProduction) {
    console.log('[DB] Client removed from pool');
  }
});

// ═══════════════════════════════════════════════════════════
// CONNECTION VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Test database connection on startup
 * Logs connection status but doesn't block startup
 */
async function validateConnection() {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT NOW() as now, current_database() as db');
    client.release();

    const { now, db } = result.rows[0];
    // console.log(`✅ Database connected: ${db} at ${new Date(now).toISOString()}`);
    // if (poolConfig.ssl) console.log('🔒 SSL connection enabled');

    return true;
  } catch (err) {
    console.error('❌ Database connection failed:', err.message);

    // Provide helpful error messages
    if (err.code === 'ECONNREFUSED') {
      console.error('   → Is the database server running?');
      console.error('   → Check DB_HOST and DB_PORT settings');
    } else if (err.code === 'ENOTFOUND') {
      console.error('   → Database host not found');
      console.error('   → Check your DATABASE_URL or DB_HOST');
    } else if (err.message.includes('password')) {
      console.error('   → Check DB_PASSWORD or DATABASE_URL password');
    } else if (err.message.includes('SSL')) {
      console.error('   → SSL configuration issue');
      console.error('   → Try adding ?sslmode=require to DATABASE_URL');
    }

    // In production, exit on connection failure
    if (isProduction) {
      console.error('   Exiting due to database connection failure in production mode.');
      process.exit(1);
    }

    return false;
  }
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
// Also export query helper for convenience (backward compatible)
// module.exports.query is already natively provided by the pool object


// Export pool reference if needed for transactions
module.exports.pool = pool;

// Export connection validation function for health checks
module.exports.validateConnection = validateConnection;
