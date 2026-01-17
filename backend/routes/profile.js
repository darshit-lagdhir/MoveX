const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const db = require('../src/config/db');

const sessionStore = require('../src/session');

async function validateSession(req, res, next) {
    const sid = req.cookies?.['movex.sid'];

    // Try cookie-based session first
    if (sid) {
        const session = await sessionStore.getSession(sid);
        if (session) {
            try {
                const result = await db.query(`
                    SELECT u.user_id, u.username, u.full_name, u.phone, u.role, u.status, 
                           u.created_at, u.last_login_at,
                           u.organization_id,
                           o.name as org_name, o.type as org_type, o.non_serviceable_areas, o.status as org_status
                    FROM users u
                    LEFT JOIN organizations o ON u.organization_id = o.organization_id
                    WHERE u.username = $1
                `, [session.username]);

                if (result.rows.length > 0 && result.rows[0].status === 'active') {
                    const row = result.rows[0];
                    req.user = {
                        id: row.user_id, username: row.username, full_name: row.full_name,
                        phone: row.phone, role: row.role, status: row.status,
                        created_at: row.created_at,
                        last_login_at: row.last_login_at, organization_id: row.organization_id
                    };
                    req.organization = row.organization_id ? {
                        id: row.organization_id, name: row.org_name, type: row.org_type,
                        non_serviceable_areas: row.non_serviceable_areas, status: row.org_status
                    } : null;
                    return next();
                }
            } catch (err) {
                console.error('Session lookup error:', err);
            }
        }
    }

    // Fallback: Try JWT token from Authorization header (for cross-origin)
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const userIdentifier = decoded.username || decoded.userId || decoded.id;

            const result = await db.query(`
                SELECT u.user_id, u.username, u.full_name, u.phone, u.role, u.status, 
                       u.created_at, u.last_login_at,
                       u.organization_id,
                       o.name as org_name, o.type as org_type, o.non_serviceable_areas, o.status as org_status
                FROM users u
                LEFT JOIN organizations o ON u.organization_id = o.organization_id
                WHERE u.username = $1 OR u.user_id::text = $1
            `, [String(userIdentifier)]);

            if (result.rows.length > 0 && result.rows[0].status === 'active') {
                const row = result.rows[0];
                req.user = {
                    id: row.user_id, username: row.username, full_name: row.full_name,
                    phone: row.phone, role: row.role, status: row.status,
                    created_at: row.created_at,
                    last_login_at: row.last_login_at, organization_id: row.organization_id
                };
                req.organization = row.organization_id ? {
                    id: row.organization_id, name: row.org_name, type: row.org_type,
                    non_serviceable_areas: row.non_serviceable_areas, status: row.org_status

                } : null;
                return next();
            }
        } catch (err) {
            console.error('JWT validation error:', err.message);
        }
    }

    // No valid auth found
    return res.status(401).json({ error: 'Not authenticated', code: 'NO_SESSION' });
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
        admin: '/admin/dashboard.html',
        franchisee: '/dashboards/franchisee.html',
        staff: '/dashboards/staff.html',
        user: '/dashboards/user.html'
    };
    return dashboards[role] || '/dashboards/user.html';
}

router.get('/me', validateSession, (req, res) => {
    const user = req.user;
    const organization = req.organization;

    const profile = {
        id: user.id,
        username: user.username,
        full_name: user.full_name,
        phone: user.phone,
        role: user.role,
        status: user.status,
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
    const username = req.user.username;

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

    values.push(username);

    try {
        await db.query(
            `UPDATE users SET ${updates.join(', ')} WHERE username = $${paramCount}`,
            values
        );

        const result = await db.query(`
            SELECT user_id, username, full_name, phone, role, status, 
                   organization_id, created_at, last_login_at
            FROM users WHERE username = $1
        `, [username]);

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
            SELECT organization_id, name, type, non_serviceable_areas, status, created_at
            FROM organizations WHERE organization_id = $1
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
                SELECT u.user_id, u.username, u.full_name, u.phone, u.role, u.status, 
                       u.created_at, u.last_login_at, o.name as org_name
                FROM users u
                LEFT JOIN organizations o ON u.organization_id = o.organization_id
                ORDER BY u.created_at DESC
            `;
            params = [];
        } else {
            if (!user.organization_id) {
                return res.json({ success: true, users: [] });
            }

            query = `
                SELECT u.user_id, u.username, u.full_name, u.phone, u.role, u.status, 
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
                   (SELECT COUNT(*) FROM users WHERE organization_id = o.organization_id) as user_count
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
