/**
 * Environment Validation Module (Local Development)
 * 
 * Validates required environment variables for local operation.
 * Shows warnings if critical variables are missing but allows the app to run.
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

/**
 * Environment variable requirements
 */
const REQUIRED_VARS = [
    'DATABASE_URL',
    'DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'
];

/**
 * Validate all environment variables
 */
function validate() {
    const missing = [];
    
    // Check if at least one database configuration exists
    const hasPrimary = Boolean(process.env.DATABASE_URL);
    const hasFallback = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'].every(v => Boolean(process.env[v]));

    if (!hasPrimary && !hasFallback) {
        missing.push('Database (Either DATABASE_URL or DB_HOST/USER/PASS/NAME)');
    }

    if (missing.length > 0) {
        console.warn('\n⚠️  MISCONFIGURED ENVIRONMENT:');
        missing.forEach(m => console.warn(`   - ${m} is missing.`));
        console.warn('   The app will attempt to run but database features may fail.\n');
    }

    return missing.length === 0;
}

// Auto-run validation once
if (!global.__envValidated) {
    global.__envValidated = true;
    validate();
}

module.exports = { validate };

