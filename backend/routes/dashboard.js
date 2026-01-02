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
            'SELECT id, username, role, status FROM users WHERE id = $1',
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
            username: req.user.username,
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
            username: req.user.username,
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
        const [shipmentCount, franchiseCount, revenueSum, failedCount, todayCount] = await Promise.all([
            db.query('SELECT COUNT(*) FROM shipments'),
            db.query("SELECT COUNT(*) FROM organizations WHERE status = 'active'"),
            db.query('SELECT SUM(price) FROM shipments'),
            db.query("SELECT COUNT(*) FROM shipments WHERE status = 'failed'"),
            db.query("SELECT COUNT(*) FROM shipments WHERE created_at > NOW() - INTERVAL '24 HOURS'"),
            db.query("SELECT COUNT(*) FROM shipments WHERE status = 'pending'")
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
                pendingShipments: parseInt(arguments[0][5]?.rows[0]?.count || 0), // Pending count (new query index 5)
                shipmentsToday: parseInt(todayCount.rows[0].count),
                shipmentTrend: `+${parseInt(todayCount.rows[0].count)} Today`,
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
        const limit = req.query.limit === 'all' ? null : (parseInt(req.query.limit) || 10);

        let queryText = `
            SELECT id, tracking_id, status, sender_name, sender_mobile, receiver_name, 
                   origin_address, destination_address, price, created_at
            FROM shipments 
            ORDER BY created_at DESC 
        `;

        if (limit) {
            queryText += ` LIMIT ${limit}`;
        }

        const result = await db.query(queryText);

        // Format for frontend
        const shipments = result.rows.map(row => ({
            id: row.tracking_id,
            status: row.status.charAt(0).toUpperCase() + row.status.slice(1).replace('_', ' '), // Clean status format
            origin: row.origin_address ? row.origin_address.split(',')[0].trim() : 'N/A',     // Show city only
            destination: row.destination_address ? row.destination_address.split(',')[0].trim() : 'N/A',
            date: new Date(row.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: parseFloat(row.price),
            customer: row.sender_name || 'N/A',
            mobile: row.sender_mobile || 'N/A'
        }));

        res.json({ success: true, shipments });
    } catch (err) {
        console.error("Dashboard Shipments Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
    }
});



// Create New Shipment
// Create New Shipment
router.post('/admin/shipments/create', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const {
            sender_name, sender_mobile, sender_address, sender_pincode,
            receiver_name, receiver_mobile, receiver_address, receiver_pincode,
            origin, destination, price, date
        } = req.body;

        // Mandatory Field Check
        if (!sender_name || !sender_mobile || !sender_address || !sender_pincode ||
            !receiver_name || !receiver_mobile || !receiver_address || !receiver_pincode ||
            !origin || !destination || !price) {
            return res.status(400).json({ success: false, error: 'All fields are mandatory' });
        }

        // Validate formats
        const nameRegex = /^[a-zA-Z\s]+$/;
        if (!nameRegex.test(sender_name) || !nameRegex.test(receiver_name)) {
            return res.status(400).json({ success: false, error: 'Names must contain only letters' });
        }

        const mobileRegex = /^[0-9+]+$/;
        if (!mobileRegex.test(sender_mobile) || !mobileRegex.test(receiver_mobile)) {
            return res.status(400).json({ success: false, error: 'Mobile numbers must contain only numbers and +' });
        }

        const pincodeRegex = /^[0-9]{6}$/;
        if (!pincodeRegex.test(sender_pincode) || !pincodeRegex.test(receiver_pincode)) {
            return res.status(400).json({ success: false, error: 'Pincodes must be exactly 6 digits' });
        }

        const amountRegex = /^\d+(\.\d{1,2})?$/;
        if (!amountRegex.test(String(price))) {
            return res.status(400).json({ success: false, error: 'Amount must be a valid number' });
        }

        // Generate Sequential Tracking ID
        // 1. Get the latest tracking ID that matches the MX pattern
        const maxIdResult = await db.query("SELECT tracking_id FROM shipments WHERE tracking_id LIKE 'MX%' ORDER BY LENGTH(tracking_id) DESC, tracking_id DESC LIMIT 1");

        let nextNum = 1;
        if (maxIdResult.rows.length > 0) {
            const lastId = maxIdResult.rows[0].tracking_id;
            const numPart = parseInt(lastId.replace('MX', ''), 10);
            if (!isNaN(numPart)) {
                nextNum = numPart + 1;
            }
        }

        const trackingId = `MX${String(nextNum).padStart(5, '0')}`;

        // Calculate estimated delivery
        const createdAt = date ? new Date(date) : new Date();
        const deliveryDate = new Date(createdAt);
        deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 4) + 2);

        const queryText = `
            INSERT INTO shipments (
                tracking_id, 
                sender_name, sender_mobile, sender_address, sender_pincode,
                receiver_name, receiver_mobile, receiver_address, receiver_pincode,
                origin_address, destination_address, 
                price, status, created_at, estimated_delivery
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, 'pending', $13, $14)
            RETURNING id, tracking_id
        `;

        const values = [
            trackingId,
            sender_name, sender_mobile, sender_address, sender_pincode,
            receiver_name, receiver_mobile, receiver_address, receiver_pincode,
            origin, destination,
            parseFloat(price), createdAt, deliveryDate
        ];

        const result = await db.query(queryText, values);

        res.json({
            success: true,
            message: 'Shipment created successfully',
            shipment: {
                id: result.rows[0].tracking_id,
                tracking_id: result.rows[0].tracking_id
            }
        });

    } catch (err) {
        console.error("Create Shipment Error:", err);
        res.status(500).json({ success: false, error: 'Failed to create shipment' });
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
