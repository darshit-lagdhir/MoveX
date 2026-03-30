const express = require('express');
const router = express.Router();
const db = require('./config/db');
const bcrypt = require('bcrypt');

/**
 * 🔒 CUSTOM AUTH MIDDLEWARE
 */
async function requireAuth(req, res, next) {
    const username = req.headers['x-user-username'];
    if (!username) return res.status(401).json({ success: false, message: 'No username header.' });
    try {
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username]);
        if (rows.length === 0) return res.status(401).json({ success: false, message: 'User not found.' });
        req.user = rows[0];
        next();
    } catch (err) { res.status(500).json({ success: false, message: 'Auth error.' }); }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) return res.status(403).json({ success: false, message: 'Forbidden.' });
        next();
    };
}

/**
 * 👤 AUTH ROUTES
 */
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username.trim().toLowerCase()]);
        const user = rows[0];
        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }
        res.json({ success: true, user: { username: user.username, role: user.role } });
    } catch (err) { res.status(500).json({ success: false, message: 'Login error.' }); }
});

router.post('/auth/register', async (req, res) => {
    try {
        const { username, password, full_name, phone } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (username, password_hash, role, status, full_name, phone) VALUES ($1, $2, $3, $4, $5, $6)',
            [username.trim().toLowerCase(), hash, 'user', 'active', full_name, phone]
        );
        res.json({ success: true });
    } catch (err) { res.status(400).json({ success: false, message: 'Registration failed.' }); }
});

/**
 * 📊 REAL-TIME STATS (ZERO HARDCODING)
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { role, organization_id, username } = req.user;
        let stats = {};

        if (role === 'admin') {
            const ship = await db.query("SELECT COUNT(*) as count, SUM(price) as rev FROM shipments");
            const usr = await db.query("SELECT COUNT(*) as count FROM users");
            const deliv = await db.query("SELECT COUNT(*) as count FROM shipments WHERE status = 'delivered'");
            const fran = await db.query("SELECT COUNT(*) as count FROM organizations");
            stats = { 
                totalShipments: parseInt(ship.rows[0].count), 
                totalUsers: parseInt(usr.rows[0].count), 
                totalRevenue: parseFloat(ship.rows[0].rev || 0),
                deliveredCount: parseInt(deliv.rows[0].count),
                totalFranchises: parseInt(fran.rows[0].count)
            };
        } else if (role === 'franchisee') {
            const ship = await db.query("SELECT COUNT(*) as count, SUM(price) as rev FROM shipments WHERE organization_id = $1", [organization_id]);
            const pend = await db.query("SELECT COUNT(*) as count FROM shipments WHERE organization_id = $1 AND status = 'pending'", [organization_id]);
            stats = { 
                totalShipments: parseInt(ship.rows[0].count), 
                totalRevenue: parseFloat(ship.rows[0].rev || 0), 
                pendingPickups: parseInt(pend.rows[0].count) 
            };
        } else { // User
            const total = await db.query("SELECT COUNT(*) as count FROM shipments WHERE creator_username = $1", [username]);
            const active = await db.query("SELECT COUNT(*) as count FROM shipments WHERE creator_username = $1 AND status NOT IN ('delivered', 'cancelled')", [username]);
            const deliv = await db.query("SELECT COUNT(*) as count FROM shipments WHERE creator_username = $1 AND status = 'delivered'", [username]);
            stats = { 
                totalShipments: parseInt(total.rows[0].count), 
                activeShipments: parseInt(active.rows[0].count), 
                deliveredShipments: parseInt(deliv.rows[0].count) 
            };
        }
        res.json({ success: true, stats });
    } catch (err) { res.status(500).json({ success: false }); }
});

/**
 * 📦 SHIPMENT MANAGEMENT
 */
router.get('/shipments', requireAuth, async (req, res) => {
    try {
        const { role, user_id, organization_id, username } = req.user;
        let query = "SELECT * FROM shipments ";
        let params = [];

        if (role === 'admin') query += "ORDER BY created_at DESC LIMIT 50";
        else if (role === 'franchisee') { query += "WHERE organization_id = $1 ORDER BY created_at DESC"; params=[organization_id]; }
        else if (role === 'staff') { query += "WHERE assigned_staff_id = $1 ORDER BY created_at DESC"; params=[user_id]; }
        else { query += "WHERE creator_username = $1 ORDER BY created_at DESC"; params=[username]; }

        const { rows } = await db.query(query, params);
        res.json({ success: true, shipments: rows });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/shipments/create', requireAuth, async (req, res) => {
    try {
        const d = req.body;
        // Generate Tracking ID MX + random 6 digits
        const trk = 'MX' + Math.floor(100000 + Math.random() * 900000);
        const orgId = req.user.role === 'franchisee' ? req.user.organization_id : (d.organization_id || null);

        await db.query(`
            INSERT INTO shipments (
                tracking_id, sender_name, sender_phone, sender_address, sender_pincode,
                receiver_name, receiver_phone, receiver_address, receiver_pincode,
                weight, price, status, organization_id, creator_username
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'pending', $12, $13)
        `, [
            trk, d.sender_name, d.sender_phone, d.sender_address, d.sender_pincode || '000000',
            d.receiver_name, d.receiver_phone, d.receiver_address, d.receiver_pincode || '000000',
            d.weight || 1, d.price || 0, orgId, req.user.username
        ]);

        res.json({ success: true, tracking_id: trk });
    } catch (err) { 
        console.error(err);
        res.status(400).json({ success: false, message: err.message }); 
    }
});

router.post('/shipments/update-status', requireAuth, async (req, res) => {
    try {
        const { tracking_id, status } = req.body;
        await db.query("UPDATE shipments SET status = $1, updated_at = NOW() WHERE tracking_id = $2", [status, tracking_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

/**
 * 🏛️ ADMIN & ORG
 */
router.get('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    const { rows } = await db.query("SELECT * FROM users ORDER BY created_at DESC");
    res.json({ success: true, users: rows });
});

router.post('/admin/users/create', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { username, password, full_name, role, phone, organization_id } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (username, password_hash, role, status, full_name, phone, organization_id) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [username.trim().toLowerCase(), hash, role, 'active', full_name, phone, organization_id || null]
        );
        res.json({ success: true });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

router.get('/admin/franchises', requireAuth, requireRole('admin'), async (req, res) => {
    const { rows } = await db.query("SELECT * FROM organizations ORDER BY created_at DESC");
    res.json({ success: true, franchises: rows });
});

router.get('/organization/staff', requireAuth, requireRole('franchisee'), async (req, res) => {
    const { rows } = await db.query("SELECT * FROM users WHERE organization_id = $1 AND role = 'staff'", [req.user.organization_id]);
    res.json({ success: true, staff: rows });
});

module.exports = router;
