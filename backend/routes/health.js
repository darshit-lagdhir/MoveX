/**
 * Health Check Endpoint
 * 
 * Provides system health information for monitoring and deployment verification.
 * 
 * Usage in app.js:
 *   const healthRoutes = require('./routes/health');
 *   app.use('/api/health', healthRoutes);
 */

const express = require('express');
const router = express.Router();
const db = require('../db');

// ═══════════════════════════════════════════════════════════
// BASIC HEALTH CHECK
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/health
 * Basic health check - always returns 200 if server is running
 */
router.get('/', (req, res) => {
    res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'movex-api'
    });
});

// ═══════════════════════════════════════════════════════════
// DETAILED HEALTH CHECK
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/health/detailed
 * Detailed health check including database connectivity
 * Only available in development or with proper auth
 */
router.get('/detailed', async (req, res) => {
    const isProduction = process.env.NODE_ENV === 'production';

    // In production, require some form of auth key for detailed health
    if (isProduction) {
        const authKey = req.headers['x-health-key'];
        const expectedKey = process.env.HEALTH_CHECK_KEY;

        if (!expectedKey || authKey !== expectedKey) {
            // Return minimal info if not authorized
            return res.json({
                status: 'ok',
                environment: 'production'
            });
        }
    }

    const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        service: 'movex-api',
        environment: process.env.NODE_ENV || 'development',
        uptime: process.uptime(),
        memory: {
            heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024) + 'MB',
            heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024) + 'MB'
        },
        checks: {}
    };

    // Database check
    try {
        const start = Date.now();
        // Use the pool's query method
        const pool = db.pool || db;
        await pool.query('SELECT NOW()');
        const duration = Date.now() - start;

        health.checks.database = {
            status: 'ok',
            responseTime: duration + 'ms'
        };
    } catch (err) {
        health.status = 'degraded';
        health.checks.database = {
            status: 'error',
            message: isProduction ? 'Database connection failed' : err.message
        };
        // Log the actual error for debugging
        if (!isProduction) {
            console.error('[Health] Database check failed:', err.message);
        }
    }

    // Storage check - DISABLED (not using photo storage currently)
    // To enable: uncomment the try/catch block below
    health.checks.storage = {
        status: 'disabled',
        message: 'Photo storage not enabled'
    };
    /*
    try {
        const storage = require('../utils/supabase-storage');
        health.checks.storage = {
            status: storage.isConfigured() ? 'ok' : 'not_configured'
        };
    } catch (err) {
        health.checks.storage = {
            status: 'not_available'
        };
    }
    */

    // Determine overall status
    const hasError = Object.values(health.checks).some(c => c.status === 'error');
    health.status = hasError ? 'unhealthy' : 'ok';

    const statusCode = health.status === 'ok' ? 200 : 503;
    res.status(statusCode).json(health);
});

// ═══════════════════════════════════════════════════════════
// READINESS CHECK (for Kubernetes/container orchestration)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/health/ready
 * Readiness check - returns 200 only if app can serve requests
 */
router.get('/ready', async (req, res) => {
    try {
        // Check database connection
        const pool = db.pool || db;
        await pool.query('SELECT NOW()');
        res.json({ ready: true });
    } catch (err) {
        console.error('[Health] Readiness check failed:', err.message);
        res.status(503).json({ ready: false, reason: 'database' });
    }
});

// ═══════════════════════════════════════════════════════════
// LIVENESS CHECK (for Kubernetes/container orchestration)
// ═══════════════════════════════════════════════════════════

/**
 * GET /api/health/live
 * Liveness check - returns 200 if process is running
 */
router.get('/live', (req, res) => {
    res.json({ live: true });
});

module.exports = router;
