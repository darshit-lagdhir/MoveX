/**
 * Simple Auth Middleware (No JWT, No Sessions)
 * 
 * Authentication is done via a simple header: X-User-Username
 * The frontend sends the logged-in username, and the middleware
 * verifies it exists and loads user data from the database.
 * 
 * Security: Password hashing (bcrypt) is used during login.
 *           This middleware just verifies the user exists and is active.
 */

const db = require('./config/db');

async function requireAuth(req, res, next) {
    // Get username from custom header (set by frontend after login)
    const username = req.headers['x-user-username'];

    if (!username) {
        return res.status(401).json({ message: 'Unauthorized' });
    }

    try {
        const result = await db.query(
            'SELECT user_id, username, full_name, phone, role, status, organization_id FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0 || result.rows[0].status !== 'active') {
            return res.status(401).json({ message: 'Unauthorized' });
        }

        const user = result.rows[0];
        req.user = user;
        req.session = { username: user.username, role: user.role, userId: user.user_id };

        // Load organization data for franchisees/staff
        if ((user.role === 'franchisee' || user.role === 'staff') && user.organization_id) {
            const orgResult = await db.query(
                'SELECT organization_id, name, pincodes, full_address, status FROM organizations WHERE organization_id = $1',
                [user.organization_id]
            );
            if (orgResult.rows.length > 0) {
                req.organization = {
                    id: orgResult.rows[0].organization_id,
                    ...orgResult.rows[0]
                };
            }
        }

        next();
    } catch (err) {
        console.error('Auth middleware error:', err);
        return res.status(500).json({ message: 'Server error' });
    }
}

function requireRole(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({ error: 'Forbidden' });
        }
        next();
    };
}

function whoami(req, res) {
    return res.json({
        success: true,
        user: {
            id: req.user.user_id,
            username: req.user.username,
            full_name: req.user.full_name,
            phone: req.user.phone,
            role: req.user.role,
            status: req.user.status,
            organization_id: req.user.organization_id
        },
        organization: req.organization || null
    });
}

module.exports = {
    requireAuth,
    requireRole,
    whoami,
    // Keep old names as aliases so nothing breaks in dashboard.js
    validateSession: requireAuth,
    requireSession: requireAuth
};
