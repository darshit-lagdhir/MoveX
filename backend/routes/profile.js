const express = require('express');
const router = express.Router();
const db = require('../src/config/db');
const { requireAuth: validateSession, requireRole } = require('../src/sessionMiddleware');

function getDashboardForRole(role) {
    const dashboards = {
        admin: '/dashboards/admin/admin-dashboard.html',
        franchisee: '/dashboards/franchisee/franchisee-dashboard.html',
        staff: '/dashboards/staff/staff-dashboard.html',
        user: '/dashboards/user/user-dashboard.html'
    };
    return dashboards[role] || '/dashboards/user/user-dashboard.html';
}

router.get('/me', validateSession, (req, res) => {
    const user = req.user;
    const organization = req.organization;

    const profile = {
        id: user.user_id,
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
        // Clean phone: remove all non-digits
        const digitsOnly = phone.replace(/[^0-9]/g, '');
        if (digitsOnly.length !== 10) {
            return res.status(400).json({ error: 'Phone number must be exactly 10 digits' });
        }
        updates.push(`phone = $${paramCount++}`);
        values.push(digitsOnly);
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
