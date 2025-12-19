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
        const result = await db.query(`
            SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, 
                   u.mfa_enabled, u.oauth_provider, u.created_at, u.last_login_at,
                   u.organization_id,
                   o.name as org_name, o.type as org_type, o.service_area, o.status as org_status
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.id = $1
        `, [session.userId]);

        if (result.rows.length === 0) {
            return res.status(401).json({ error: 'User not found', code: 'USER_NOT_FOUND' });
        }

        const row = result.rows[0];

        const user = {
            id: row.id,
            email: row.email,
            full_name: row.full_name,
            phone: row.phone,
            role: row.role,
            status: row.status,
            mfa_enabled: row.mfa_enabled,
            oauth_provider: row.oauth_provider,
            created_at: row.created_at,
            last_login_at: row.last_login_at,
            organization_id: row.organization_id
        };

        const organization = row.organization_id ? {
            id: row.organization_id,
            name: row.org_name,
            type: row.org_type,
            service_area: row.service_area,
            status: row.org_status
        } : null;

        if (user.status !== 'active') {
            return res.status(403).json({ error: 'Account is disabled', code: 'ACCOUNT_DISABLED' });
        }

        req.user = user;
        req.organization = organization;
        next();
    } catch (err) {
        console.error('Profile auth error:', err);
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
                code: 'ROLE_MISMATCH'
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
    const user = req.user;
    const organization = req.organization;

    const profile = {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        status: user.status,
        mfa_enabled: user.mfa_enabled,
        oauth_provider: user.oauth_provider,
        created_at: user.created_at,
        last_login_at: user.last_login_at,
        dashboard: getDashboardForRole(user.role)
    };

    res.json({
        success: true,
        user: profile,
        organization: organization
    });
});

router.put('/me', validateSession, async (req, res) => {
    const { full_name, phone } = req.body;
    const userId = req.user.id;

    const updates = [];
    const values = [];
    let paramCount = 1;

    if (full_name !== undefined) {
        updates.push(`full_name = $${paramCount++}`);
        values.push(full_name.trim().substring(0, 255));
    }

    if (phone !== undefined) {
        const cleanPhone = phone.replace(/[^0-9+\-\s()]/g, '').substring(0, 50);
        updates.push(`phone = $${paramCount++}`);
        values.push(cleanPhone);
    }

    if (updates.length === 0) {
        return res.status(400).json({ error: 'No valid fields to update' });
    }

    values.push(userId);

    try {
        await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE id = $${paramCount}`,
            values
        );

        const result = await db.query(`
            SELECT id, email, full_name, phone, role, status, mfa_enabled, oauth_provider, 
                   organization_id, created_at, last_login_at
            FROM users WHERE id = $1
        `, [userId]);

        res.json({
            success: true,
            message: 'Profile updated successfully',
            user: result.rows[0]
        });
    } catch (err) {
        console.error('Profile update error:', err);
        res.status(500).json({ error: 'Failed to update profile' });
    }
});

router.get('/organization/me', validateSession, async (req, res) => {
    const orgId = req.user.organization_id;

    if (!orgId) {
        return res.json({
            success: true,
            organization: null,
            message: 'User is not associated with an organization'
        });
    }

    try {
        const result = await db.query(`
            SELECT id, name, type, service_area, status, created_at
            FROM organizations WHERE id = $1
        `, [orgId]);

        if (result.rows.length === 0) {
            return res.status(404).json({ error: 'Organization not found' });
        }

        res.json({
            success: true,
            organization: result.rows[0]
        });
    } catch (err) {
        console.error('Organization fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch organization' });
    }
});

router.get('/organization/users', validateSession, requireRole('admin', 'franchisee'), async (req, res) => {
    const user = req.user;

    try {
        let query, params;

        if (user.role === 'admin') {
            query = `
                SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, 
                       u.created_at, u.last_login_at, o.name as org_name
                FROM users u
                LEFT JOIN organizations o ON u.organization_id = o.id
                ORDER BY u.created_at DESC
            `;
            params = [];
        } else {
            if (!user.organization_id) {
                return res.json({ success: true, users: [] });
            }

            query = `
                SELECT u.id, u.email, u.full_name, u.phone, u.role, u.status, 
                       u.created_at, u.last_login_at
                FROM users u
                WHERE u.organization_id = $1
                ORDER BY u.created_at DESC
            `;
            params = [user.organization_id];
        }

        const result = await db.query(query, params);

        res.json({
            success: true,
            users: result.rows,
            total: result.rows.length
        });
    } catch (err) {
        console.error('Organization users fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch users' });
    }
});

router.get('/organizations', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, 
                   (SELECT COUNT(*) FROM users WHERE organization_id = o.id) as user_count
            FROM organizations o
            ORDER BY o.created_at DESC
        `);

        res.json({
            success: true,
            organizations: result.rows
        });
    } catch (err) {
        console.error('Organizations fetch error:', err);
        res.status(500).json({ error: 'Failed to fetch organizations' });
    }
});

module.exports = router;
