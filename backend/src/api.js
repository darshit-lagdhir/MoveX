const express = require('express');
const router = express.Router();
const db = require('./config/db');
const bcrypt = require('bcrypt');

/**
 * ═══════════════════════════════════════════════════════════
 *  🔒 AUTHENTICATION MIDDLEWARE
 * ═══════════════════════════════════════════════════════════
 */

async function requireAuth(req, res, next) {
    const username = req.headers['x-user-username'];
    if (!username) return res.status(401).json({ success: false, message: 'Unauthorized: No username provided.' });

    try {
        const result = await db.query(
            'SELECT user_id, username, full_name, phone, role, status, organization_id FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0 || result.rows[0].status !== 'active') {
            return res.status(401).json({ success: false, message: 'Unauthorized: User not found or disabled.' });
        }

        req.user = result.rows[0];
        next();
    } catch (err) {
        res.status(500).json({ success: false, message: 'Server authentication error.' });
    }
}

function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.user || !roles.includes(req.user.role)) {
            return res.status(403).json({ success: false, message: 'Forbidden: Insufficient permissions.' });
        }
        next();
    };
}

/**
 * ═══════════════════════════════════════════════════════════
 *  👤 USER ACCOUNT & PROFILE
 * ═══════════════════════════════════════════════════════════
 */

// Login (Standard verification)
router.post('/auth/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const normalized = username.trim().toLowerCase();
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [normalized]);
        const user = rows[0];

        if (!user || !(await bcrypt.compare(password, user.password_hash))) {
            return res.status(400).json({ success: false, message: 'Invalid username or password.' });
        }

        if (user.status !== 'active') return res.status(403).json({ success: false, message: 'Account disabled.' });

        res.json({ success: true, user: { id: user.user_id, username: user.username, role: user.role } });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Login failed.' });
    }
});

// Register (Default role: user)
router.post('/auth/register', async (req, res) => {
    try {
        const { username, password, full_name, phone } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (username, password_hash, role, status, full_name, phone) VALUES ($1, $2, $3, $4, $5, $6)',
            [username.trim().toLowerCase(), hash, 'user', 'active', full_name, phone]
        );
        res.status(201).json({ success: true, message: 'Registration successful.' });
    } catch (err) {
        res.status(400).json({ success: false, message: 'Registration failed (Username might already exist).' });
    }
});

// Profile - Get current info
router.get('/profile/me', requireAuth, async (req, res) => {
    const user = req.user;
    let organization = null;

    if (user.organization_id) {
        const orgRes = await db.query('SELECT * FROM organizations WHERE organization_id = $1', [user.organization_id]);
        organization = orgRes.rows[0];
    }

    res.json({ success: true, user, organization });
});

/**
 * ═══════════════════════════════════════════════════════════
 *  📊 ROLE-AWARE STATS (ONE ENDPOINT FOR ALL)
 * ═══════════════════════════════════════════════════════════
 */

router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { role, user_id, organization_id, username } = req.user;
        let stats = {};

        if (role === 'admin') {
            const ship = await db.query("SELECT COUNT(*) FROM shipments");
            const usr = await db.query("SELECT COUNT(*) FROM users");
            const rev = await db.query("SELECT SUM(price) FROM shipments");
            stats = { totalShipments: parseInt(ship.rows[0].count), totalUsers: parseInt(usr.rows[0].count), totalRevenue: parseFloat(rev.rows[0].sum || 0) };
        } 
        else if (role === 'franchisee') {
            const ship = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1", [organization_id]);
            const rev = await db.query("SELECT SUM(price) FROM shipments WHERE organization_id = $1", [organization_id]);
            const pend = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1 AND status = 'pending'", [organization_id]);
            stats = { totalShipments: parseInt(ship.rows[0].count), totalRevenue: parseFloat(rev.rows[0].sum || 0), pendingPickups: parseInt(pend.rows[0].count) };
        }
        else if (role === 'staff') {
            const pend = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_staff_id = $1 AND status = 'pending'", [user_id]);
            const out = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_staff_id = $1 AND status = 'out_for_delivery'", [user_id]);
            const deliv = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_staff_id = $1 AND status = 'delivered' AND updated_at >= CURRENT_DATE", [user_id]);
            stats = { pendingTasks: parseInt(pend.rows[0].count), outForDelivery: parseInt(out.rows[0].count), deliveredToday: parseInt(deliv.rows[0].count) };
        }
        else { // User
            const total = await db.query("SELECT COUNT(*) FROM shipments WHERE creator_username = $1", [username]);
            const act = await db.query("SELECT COUNT(*) FROM shipments WHERE creator_username = $1 AND status NOT IN ('delivered', 'cancelled')", [username]);
            const deliv = await db.query("SELECT COUNT(*) FROM shipments WHERE creator_username = $1 AND status = 'delivered'", [username]);
            stats = { totalShipments: parseInt(total.rows[0].count), activeShipments: parseInt(act.rows[0].count), deliveredShipments: parseInt(deliv.rows[0].count) };
        }

        res.json({ success: true, stats });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch stats.' });
    }
});

/**
 * ═══════════════════════════════════════════════════════════
 *  📦 ROLE-AWARE SHIPMENTS (ONE ENDPOINT FOR ALL)
 * ═══════════════════════════════════════════════════════════
 */

router.get('/shipments', requireAuth, async (req, res) => {
    try {
        const { role, user_id, organization_id, username } = req.user;
        let query = "";
        let params = [];

        if (role === 'admin') {
            query = "SELECT * FROM shipments ORDER BY created_at DESC LIMIT 100";
        } else if (role === 'franchisee') {
            query = "SELECT * FROM shipments WHERE organization_id = $1 ORDER BY created_at DESC";
            params = [organization_id];
        } else if (role === 'staff') {
            query = "SELECT * FROM shipments WHERE assigned_staff_id = $1 ORDER BY created_at DESC";
            params = [user_id];
        } else {
            query = "SELECT * FROM shipments WHERE creator_username = $1 ORDER BY created_at DESC";
            params = [username];
        }

        const result = await db.query(query, params);
        const shipments = result.rows.map(row => ({
            id: row.shipment_id,
            tracking_id: 'MX-' + row.shipment_id,
            status: row.status,
            sender: row.sender_name,
            receiver: row.receiver_name,
            origin: row.origin_address || 'N/A',
            destination: row.destination_address || 'N/A',
            price: row.price,
            date: row.created_at,
            staff_id: row.assigned_staff_id
        }));

        res.json({ success: true, shipments });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Failed to fetch shipments.' });
    }
});

/**
 * ═══════════════════════════════════════════════════════════
 *  🛠️ OPERATIONS & MANAGEMENT
 * ═══════════════════════════════════════════════════════════
 */

// Create Shipment (User or Franchisee)
router.post('/shipments/create', requireAuth, async (req, res) => {
    try {
        const { sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, price } = req.body;
        const orgId = req.user.role === 'franchisee' ? req.user.organization_id : null;

        const result = await db.query(`
            INSERT INTO shipments (sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, price, status, organization_id, creator_username)
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10) RETURNING shipment_id
        `, [sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, price || 0, orgId, req.user.username]);

        res.json({ success: true, tracking_id: 'MX-' + result.rows[0].shipment_id });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Creation failed.' });
    }
});

// Update Shipment Status (Staff or Admin)
router.post('/shipments/update-status', requireAuth, requireRole('staff', 'admin'), async (req, res) => {
    try {
        const { tracking_id, status } = req.body;
        const id = tracking_id.replace('MX-', '');
        await db.query("UPDATE shipments SET status = $1, updated_at = NOW() WHERE shipment_id = $2", [status.toLowerCase(), id]);
        res.json({ success: true, message: 'Status updated successfully.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Update failed.' });
    }
});

// Assign Staff (Franchisee)
router.post('/shipments/assign', requireAuth, requireRole('franchisee'), async (req, res) => {
    try {
        const { tracking_id, staff_id } = req.body;
        const id = tracking_id.replace('MX-', '');
        await db.query("UPDATE shipments SET assigned_staff_id = $1, status = 'out_for_delivery' WHERE shipment_id = $2", [staff_id, id]);
        res.json({ success: true, message: 'Agent assigned.' });
    } catch (err) {
        res.status(500).json({ success: false, message: 'Assignment failed.' });
    }
});

/**
 * ═══════════════════════════════════════════════════════════
 *  🏛️ ADMINISTRATIVE (ORGANIZATION & USERS)
 * ═══════════════════════════════════════════════════════════
 */

router.get('/admin/users', requireAuth, requireRole('admin'), async (req, res) => {
    const result = await db.query("SELECT user_id, username, full_name, role, status FROM users ORDER BY created_at DESC");
    res.json({ success: true, users: result.rows });
});

router.get('/admin/franchises', requireAuth, requireRole('admin'), async (req, res) => {
    const result = await db.query("SELECT organization_id, name, pincodes, status FROM organizations ORDER BY created_at DESC");
    res.json({ success: true, franchises: result.rows });
});

router.get('/organization/staff', requireAuth, requireRole('franchisee'), async (req, res) => {
    const result = await db.query("SELECT user_id, full_name, username FROM users WHERE organization_id = $1 AND role = 'staff'", [req.user.organization_id]);
    res.json({ success: true, staff: result.rows });
});

module.exports = router;
