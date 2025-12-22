/**
 * Environment Validation Module
 * 
 * Validates all required environment variables at startup.
 * Fails fast in production if critical variables are missing.
 * 
 * Usage:
 *   require('./utils/validate-env');  // Will throw/exit if critical vars missing
 */

const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Environment variable requirements
 * 
 * critical: App will not start without these
 * recommended: Warning shown but app will start
 * optional: Only validated if present
 */
const ENV_SCHEMA = {
    // ─────────────────────────────────────────────────────────
    // CRITICAL - App will exit if missing in production
    // ─────────────────────────────────────────────────────────
    critical: [
        {
            name: 'JWT_SECRET',
            minLength: 32,
            description: 'Secret for signing JWT tokens'
        },
        {
            name: 'SESSION_SECRET',
            minLength: 32,
            description: 'Secret for signing session cookies'
        }
    ],

    // ─────────────────────────────────────────────────────────
    // DATABASE - One of these must be set
    // ─────────────────────────────────────────────────────────
    database: {
        primary: 'DATABASE_URL',
        fallback: ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'],
        description: 'Database connection details'
    },

    // ─────────────────────────────────────────────────────────
    // RECOMMENDED - Warning if missing but app will run
    // ─────────────────────────────────────────────────────────
    recommended: [
        {
            name: 'NODE_ENV',
            validValues: ['development', 'production', 'test'],
            default: 'development',
            description: 'Application environment'
        },
        {
            name: 'PORT',
            type: 'number',
            default: 4000,
            description: 'Server port'
        }
    ],

    // ─────────────────────────────────────────────────────────
    // OPTIONAL - Validated only if present
    // ─────────────────────────────────────────────────────────
    optional: [
        {
            name: 'FRONTEND_URL',
            type: 'url',
            description: 'Frontend URL for CORS'
        },
        {
            name: 'SUPABASE_URL',
            type: 'url',
            description: 'Supabase project URL'
        },
        {
            name: 'SUPABASE_SERVICE_KEY',
            minLength: 100,
            description: 'Supabase service key (backend only)'
        }
    ]
};

// ═══════════════════════════════════════════════════════════
// VALIDATION FUNCTIONS
// ═══════════════════════════════════════════════════════════

const errors = [];
const warnings = [];

/**
 * Check if a value looks like a URL
 */
function isValidUrl(value) {
    try {
        new URL(value);
        return true;
    } catch {
        return false;
    }
}

/**
 * Validate a single environment variable
 */
function validateVar(spec) {
    const value = process.env[spec.name];

    // Check if present
    if (!value) {
        return { missing: true };
    }

    // Check minimum length
    if (spec.minLength && value.length < spec.minLength) {
        return {
            invalid: true,
            reason: `must be at least ${spec.minLength} characters (got ${value.length})`
        };
    }

    // Check valid values
    if (spec.validValues && !spec.validValues.includes(value)) {
        return {
            invalid: true,
            reason: `must be one of: ${spec.validValues.join(', ')}`
        };
    }

    // Check type
    if (spec.type === 'number' && isNaN(parseInt(value, 10))) {
        return { invalid: true, reason: 'must be a number' };
    }

    if (spec.type === 'url' && !isValidUrl(value)) {
        return { invalid: true, reason: 'must be a valid URL' };
    }

    return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// RUN VALIDATION
// ═══════════════════════════════════════════════════════════

/**
 * Validate all environment variables
 */
function validate() {
    // console.log('🔍 Validating environment configuration...');

    // Check critical variables
    for (const spec of ENV_SCHEMA.critical) {
        const result = validateVar(spec);
        if (result.missing) {
            errors.push(`❌ ${spec.name} is required (${spec.description})`);
        } else if (result.invalid) {
            errors.push(`❌ ${spec.name} ${result.reason}`);
        }
    }

    // Check database configuration
    const db = ENV_SCHEMA.database;
    const hasPrimary = Boolean(process.env[db.primary]);
    const hasFallback = db.fallback.every(v => Boolean(process.env[v]));

    if (!hasPrimary && !hasFallback) {
        if (isProduction) {
            errors.push(`❌ Database not configured. Set ${db.primary} or (${db.fallback.join(', ')})`);
        } else {
            warnings.push(`⚠️ Database not configured - some features will not work`);
        }
    }

    // Check recommended variables
    for (const spec of ENV_SCHEMA.recommended) {
        const result = validateVar(spec);
        if (result.missing && !spec.default) {
            warnings.push(`⚠️ ${spec.name} not set (${spec.description})`);
        } else if (result.invalid) {
            warnings.push(`⚠️ ${spec.name} ${result.reason}`);
        }
    }

    // Check optional variables (only if present)
    for (const spec of ENV_SCHEMA.optional) {
        if (process.env[spec.name]) {
            const result = validateVar(spec);
            if (result.invalid) {
                warnings.push(`⚠️ ${spec.name} ${result.reason}`);
            }
        }
    }

    // Report results
    if (warnings.length > 0) {
        console.log('\n📋 Configuration warnings:');
        warnings.forEach(w => console.log('  ' + w));
    }

    if (errors.length > 0) {
        console.log('\n🚨 Configuration errors:');
        errors.forEach(e => console.log('  ' + e));

        if (isProduction) {
            console.log('\n💥 Cannot start in production mode with configuration errors.');
            console.log('   Fix the above issues or set NODE_ENV=development to bypass.\n');
            process.exit(1);
        } else {
            console.log('\n⚠️ Running in development mode - continuing with warnings.\n');
        }
    }

    // Success logs silenced
    // if (errors.length === 0 && warnings.length === 0) {
    //     console.log('✅ All environment variables configured correctly.\n');
    // } else if (errors.length === 0) {
    //     console.log('\n✅ Critical configuration valid (warnings above are optional).\n');
    // }

    return {
        valid: errors.length === 0,
        errors,
        warnings
    };
}

// ═══════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════

module.exports = {
    validate,
    ENV_SCHEMA,
    isProduction
};

// Run validation if this file is required directly
if (require.main !== module) {
    // Only validate once, not on every require
    if (!global.__envValidated) {
        global.__envValidated = true;
        validate();
    }
}
