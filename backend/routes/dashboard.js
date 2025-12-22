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

router.get('/admin/stats', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const stats = await db.query('SELECT COUNT(*) as total FROM users');
        const active = await db.query("SELECT COUNT(*) as active FROM users WHERE status = 'active'");
        res.json({
            success: true,
            stats: {
                users: parseInt(stats.rows[0].total),
                active: parseInt(active.rows[0].active),
                franchises: 0
            }
        });
    } catch (err) {
        res.json({ success: true, stats: { users: 0, active: 0, franchises: 0 } });
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
