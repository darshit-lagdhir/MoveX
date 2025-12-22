const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');

const sessionStore = require('../src/session');

async function validateSession(req, res, next) {
    const sid = req.cookies?.['movex.sid'];

    if (!sid) {
        return res.status(401).json({ error: 'Not authenticated', code: 'NO_SESSION' });
    }

    const session = sessionStore.getSession(sid);
    if (!session) {
        return res.status(401).json({ error: 'Session expired', code: 'SESSION_EXPIRED' });
    }

    try {
        const result = await db.query(
            'SELECT id, email, role, status FROM users WHERE id = $1',
            [session.userId]
        );

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }

        const user = result.rows[0];

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is disabled', code: 'ACCOUNT_DISABLED' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.error('Dashboard auth error:', err);
        return res.status(401).json({ error: 'Auth failed', code: 'INVALID_SESSION' });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                error: 'Access denied',
                code: 'ROLE_MISMATCH',
                allowedRoles,
                userRole: req.user.role,
                redirect: getDashboardForRole(req.user.role)
            });
        }

        next();
    };
}

function getDashboardForRole(role) {
    const dashboards = {
        admin: '/admin-dashboard.html',
        franchisee: '/franchisee-dashboard.html',
        staff: '/staff-dashboard.html',
        user: '/user-dashboard.html',
        customer: '/customer-dashboard.html'
    };
    return dashboards[role] || '/user-dashboard.html';
}

router.get('/me', validateSession, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            mfa_enabled: req.user.mfa_enabled,
            mfa_enabled: req.user.mfa_enabled,
            dashboard: getDashboardForRole(req.user.role)
        }
    });
});

router.get('/profile', validateSession, (req, res) => {
    res.json({
        success: true,
        user: {
            id: req.user.id,
            email: req.user.email,
            role: req.user.role,
            mfa_enabled: req.user.mfa_enabled,
            mfa_enabled: req.user.mfa_enabled,
            dashboard: getDashboardForRole(req.user.role)
        }
    });
});

router.get('/admin', validateSession, requireRole('admin'), (req, res) => {
    res.json({ success: true, message: 'Admin access granted', user: req.user });
});

router.get('/franchisee', validateSession, requireRole('admin', 'franchisee'), (req, res) => {
    res.json({ success: true, message: 'Franchisee access granted', user: req.user });
});

router.get('/staff', validateSession, requireRole('admin', 'franchisee', 'staff'), (req, res) => {
    res.json({ success: true, message: 'Staff access granted', user: req.user });
});

// Real-time Admin Stats
router.get('/admin/stats', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const [shipmentCount, franchiseCount, revenueSum, failedCount] = await Promise.all([
            db.query('SELECT COUNT(*) FROM shipments'),
            db.query("SELECT COUNT(*) FROM organizations WHERE status = 'active'"),
            db.query('SELECT SUM(price) FROM shipments'),
            db.query("SELECT COUNT(*) FROM shipments WHERE status = 'failed'")
        ]);

        const totalShipments = parseInt(shipmentCount.rows[0].count);
        const activeFranchises = parseInt(franchiseCount.rows[0].count);
        const totalRevenue = parseFloat(revenueSum.rows[0].sum || 0);
        const failed = parseInt(failedCount.rows[0].count);

        // Calculate percentage, default to 0 to avoid NaN
        const failedPercentage = totalShipments > 0 ? ((failed / totalShipments) * 100).toFixed(1) : 0;

        res.json({
            success: true,
            stats: {
                totalShipments: totalShipments,
                activeFranchises: activeFranchises,
                totalRevenue: totalRevenue,
                failedDeliveries: parseFloat(failedPercentage),
                // Simple placeholder trends for now (could be calculated with historical queries)
                shipmentTrend: 'Real-time Data',
                franchiseTrend: 'Active count',
                revenueTrend: 'Lifetime',
                failedTrend: 'Failure Rate'
            }
        });
    } catch (err) {
        console.error("Dashboard Stats Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// Recent Shipments for Dashboard
router.get('/admin/shipments', validateSession, requireRole('admin'), async (req, res) => {
    try {
        // Fetch latest 10 shipments
        const result = await db.query(`
            SELECT id, tracking_id, status, sender_name, receiver_name, 
                   origin_address, destination_address, price, created_at
            FROM shipments 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        // Format for frontend
        const shipments = result.rows.map(row => ({
            id: row.tracking_id,
            status: row.status.charAt(0).toUpperCase() + row.status.slice(1).replace('_', ' '), // Clean status format
            origin: row.origin_address ? row.origin_address.split(',')[0].trim() : 'N/A',     // Show city only
            destination: row.destination_address ? row.destination_address.split(',')[0].trim() : 'N/A',
            date: new Date(row.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: parseFloat(row.price),
            customer: row.sender_name || 'N/A',
            email: 'N/A' // Email not currently in shipments table
        }));

        res.json({ success: true, shipments });
    } catch (err) {
        console.error("Dashboard Shipments Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
    }
});



router.post('/logout', async (req, res) => {
    // 1. Destroy JWT Cookie (if any)
    res.clearCookie('movex_session', { path: '/' });

    // 2. Destroy Server Session and Cookie
    const sid = req.cookies?.['movex.sid'];
    if (sid) {
        sessionStore.destroySession(sid);
        res.clearCookie('movex.sid', { path: '/' });
    }

    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
