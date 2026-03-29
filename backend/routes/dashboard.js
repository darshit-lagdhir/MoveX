const express = require('express');
const router = express.Router();
const db = require('../src/config/db');
const { validateSession, requireRole, whoami } = require('../src/sessionMiddleware');
const bcrypt = require('bcrypt');

// ═══════════════════════════════════════════════════════════
//  COMMON LOGIC
// ═══════════════════════════════════════════════════════════

router.get('/auth/whoami', validateSession, whoami);

// ═══════════════════════════════════════════════════════════
//  STAFF - DASHBOARD & SHIPMENTS
// ═══════════════════════════════════════════════════════════

router.get('/staff/stats', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const userId = req.user.user_id;
        const pending = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_staff_id = $1 AND status = 'pending'", [userId]);
        const out = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_staff_id = $1 AND status = 'out_for_delivery'", [userId]);
        const delivered = await db.query("SELECT COUNT(*) FROM shipments WHERE assigned_staff_id = $1 AND status = 'delivered' AND updated_at >= CURRENT_DATE", [userId]);

        res.json({
            success: true,
            stats: {
                pendingTasks: parseInt(pending.rows[0].count),
                outForDelivery: parseInt(out.rows[0].count),
                deliveredToday: parseInt(delivered.rows[0].count)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.get('/staff/shipments', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const userId = req.user.user_id;
        const result = await db.query("SELECT * FROM shipments WHERE assigned_staff_id = $1 ORDER BY created_at DESC", [userId]);
        
        // Simpler rendering preparation
        const list = [];
        for (let row of result.rows) {
            list.push({
                tracking_id: 'MX-' + row.shipment_id,
                status: row.status,
                sender: row.sender_name,
                receiver: row.receiver_name,
                address: row.receiver_address,
                phone: row.receiver_phone,
                weight: row.weight,
                date: row.created_at
            });
        }
        res.json({ success: true, shipments: list });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.post('/staff/shipments/update-status', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const { tracking_id, status } = req.body;
        const id = tracking_id.replace('MX-', ''); // Simple inverse logic
        
        await db.query("UPDATE shipments SET status = $1, updated_at = NOW() WHERE shipment_id = $2", [status.toLowerCase(), id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Update failed' });
    }
});

// ═══════════════════════════════════════════════════════════
//  FRANCHISEE - DASHBOARD & OPERATIONS
// ═══════════════════════════════════════════════════════════

router.get('/franchisee/stats', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1", [orgId]);
        const revenue = await db.query("SELECT SUM(price) FROM shipments WHERE organization_id = $1", [orgId]);
        const pending = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1 AND status = 'pending'", [orgId]);

        res.json({
            success: true,
            stats: {
                totalShipments: parseInt(result.rows[0].count),
                totalRevenue: parseFloat(revenue.rows[0].sum || 0),
                pendingPickups: parseInt(pending.rows[0].count)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.get('/franchisee/shipments', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query("SELECT * FROM shipments WHERE organization_id = $1 ORDER BY created_at DESC", [orgId]);
        
        const list = [];
        for (let row of result.rows) {
            list.push({
                tracking_id: 'MX-' + row.shipment_id,
                status: row.status,
                sender: row.sender_name,
                origin: row.origin_address,
                destination: row.destination_address,
                price: row.price,
                date: row.created_at
            });
        }
        res.json({ success: true, shipments: list });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.post('/franchisee/shipments/create', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const { sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, amount } = req.body;
        const orgId = req.user.organization_id;

        const result = await db.query(`
            INSERT INTO shipments (
                sender_name, sender_phone, sender_address,
                receiver_name, receiver_phone, receiver_address,
                weight, price, status, organization_id, creator_username
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'pending', $9, $10)
            RETURNING shipment_id
        `, [sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, amount, orgId, req.user.username]);

        res.json({ success: true, tracking_id: 'MX-' + result.rows[0].shipment_id });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Failed to create shipment' });
    }
});

router.get('/franchisee/staff', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query("SELECT user_id, full_name, username FROM users WHERE organization_id = $1 AND role = 'staff'", [orgId]);
        res.json({ success: true, staff: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.get('/franchisee/assignments/available', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.user.organization_id;
        const result = await db.query("SELECT * FROM shipments WHERE organization_id = $1 AND assigned_staff_id IS NULL", [orgId]);
        
        const list = [];
        for (let row of result.rows) {
            list.push({
                tracking_id: 'MX-' + row.shipment_id,
                receiver: row.receiver_name,
                destination: row.destination_address
            });
        }
        res.json({ success: true, shipments: list });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.post('/franchisee/assign', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const { tracking_id, staff_id } = req.body;
        const id = tracking_id.replace('MX-', '');
        await db.query("UPDATE shipments SET assigned_staff_id = $1, status = 'out_for_delivery' WHERE shipment_id = $2", [staff_id, id]);
        res.json({ success: true, message: 'Assigned successfully' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Assignment failed' });
    }
});

// ═══════════════════════════════════════════════════════════
//  USER / CUSTOMER
// ═══════════════════════════════════════════════════════════

router.get('/user/stats', validateSession, requireRole('user'), async (req, res) => {
    try {
        const username = req.user.username;
        const total = await db.query("SELECT COUNT(*) FROM shipments WHERE creator_username = $1", [username]);
        const active = await db.query("SELECT COUNT(*) FROM shipments WHERE creator_username = $1 AND status != 'delivered' AND status != 'cancelled'", [username]);
        const delivered = await db.query("SELECT COUNT(*) FROM shipments WHERE creator_username = $1 AND status = 'delivered'", [username]);

        res.json({ 
            success: true, 
            stats: { 
                totalShipments: parseInt(total.rows[0].count),
                activeShipments: parseInt(active.rows[0].count),
                deliveredShipments: parseInt(delivered.rows[0].count)
            } 
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.get('/user/shipments', validateSession, requireRole('user'), async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM shipments WHERE creator_username = $1 ORDER BY created_at DESC", [req.user.username]);
        
        const list = [];
        for (let row of result.rows) {
            list.push({
                tracking_id: 'MX-' + row.shipment_id,
                status: row.status,
                receiver: row.receiver_name,
                destination: row.destination_address,
                price: row.price,
                date: row.created_at
            });
        }
        res.json({ success: true, shipments: list });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.post('/user/shipments/create', validateSession, requireRole('user'), async (req, res) => {
    try {
        const { sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight } = req.body;
        
        const result = await db.query(`
            INSERT INTO shipments (
                sender_name, sender_phone, sender_address,
                receiver_name, receiver_phone, receiver_address,
                weight, status, creator_username
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'pending', $8)
            RETURNING shipment_id
        `, [sender_name, sender_phone, sender_address, receiver_name, receiver_phone, receiver_address, weight, req.user.username]);

        res.json({ success: true, tracking_id: 'MX-' + result.rows[0].shipment_id });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Booking failed' });
    }
});

// ═══════════════════════════════════════════════════════════
//  ADMIN (EXTREMELY SIMPLIFIED)
// ═══════════════════════════════════════════════════════════

router.get('/admin/stats', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query("SELECT COUNT(*) FROM shipments");
        const users = await db.query("SELECT COUNT(*) FROM users");
        const money = await db.query("SELECT SUM(price) FROM shipments");

        res.json({
            success: true,
            stats: {
                totalShipments: parseInt(result.rows[0].count),
                totalUsers: parseInt(users.rows[0].count),
                totalRevenue: parseFloat(money.rows[0].sum || 0)
            }
        });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.get('/admin/shipments', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM shipments ORDER BY created_at DESC LIMIT 50");
        const list = [];
        for (let row of result.rows) {
            list.push({
                tracking_id: 'MX-' + row.shipment_id,
                status: row.status,
                sender: row.sender_name,
                receiver: row.receiver_name,
                origin: row.origin_address || 'N/A',
                destination: row.destination_address || 'N/A',
                price: row.price,
                date: row.created_at
            });
        }
        res.json({ success: true, shipments: list });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.get('/admin/users', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query("SELECT user_id, username, full_name, role, status FROM users ORDER BY created_at DESC");
        res.json({ success: true, users: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.get('/admin/franchises', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query("SELECT organization_id, name, pincodes, status FROM organizations ORDER BY created_at DESC");
        res.json({ success: true, franchises: result.rows });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Database error' });
    }
});

router.post('/admin/users/reset-password', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { username, password } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await db.query("UPDATE users SET password_hash = $1 WHERE username = $2", [hash, username]);
        res.json({ success: true, message: 'Password updated' });
    } catch (err) {
        res.status(500).json({ success: false, error: 'Reset failed' });
    }
});

module.exports = router;
