/**
 * Database Connection (Backward Compatibility Layer)
 * 
 * This file re-exports the main database connection from src/config/db.js
 * to maintain backward compatibility with modules that import from 'db' or '../db'.
 * 
 * IMPORTANT: All database configuration is in src/config/db.js
 * This file exists only to avoid breaking existing imports.
 */

// Import the main database configuration (which includes dotenv and TLS setup)
const pool = require('../src/config/db');

// Re-export with the same interface this file previously provided
module.exports = {
        query: (text, params) => pool.query(text, params),
        pool: pool
};