const express = require('express');
const router = express.Router();
const db = require('../src/config/db');
const { validateSession, requireRole, clearSessionCookie } = require('../src/sessionMiddleware');
const sessionStore = require('../src/session'); // Needed for logout
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Dashboard Stats
router.get('/admin/stats', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const totalShipmentsRes = await db.query('SELECT COUNT(*) FROM shipments');
        const activeFranchisesRes = await db.query("SELECT COUNT(*) FROM organizations WHERE type = 'franchise' AND status = 'active'");
        const revenueSum = await db.query('SELECT SUM(price) FROM shipments');
        const failedCount = await db.query("SELECT COUNT(*) FROM shipments WHERE status = 'failed' or status='returned'");
        const todayCount = await db.query("SELECT COUNT(*) FROM shipments WHERE created_at >= NOW() - INTERVAL '24 HOURS'");

        // Get Pending Shipments Count
        const pendingCount = await db.query("SELECT COUNT(*) FROM shipments WHERE status = 'pending'");

        const totalShipments = parseInt(totalShipmentsRes.rows[0].count);
        const activeFranchises = parseInt(activeFranchisesRes.rows[0].count);
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
                pendingShipments: parseInt(pendingCount.rows[0].count),
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
            SELECT id, tracking_id, status, 
                   sender_name, sender_mobile, sender_address, sender_pincode,
                   receiver_name, receiver_mobile, receiver_address, receiver_pincode,
                   origin_address, destination_address, 
                   price, weight, created_at, updated_at, estimated_delivery
            FROM shipments 
            ORDER BY created_at DESC 
        `;

        if (limit) {
            queryText += ` LIMIT ${limit} `;
        }

        const result = await db.query(queryText);

        // Format for frontend
        const shipments = result.rows.map(row => ({
            id: row.tracking_id,
            status: row.status.charAt(0).toUpperCase() + row.status.slice(1).replace('_', ' '),
            origin: row.origin_address ? row.origin_address.split(',')[0].trim() : 'N/A',
            destination: row.destination_address ? row.destination_address.split(',')[0].trim() : 'N/A',
            date: new Date(row.created_at).toLocaleDateString("en-US", { month: 'short', day: 'numeric', year: 'numeric' }),
            amount: parseFloat(row.price),
            sender: row.sender_name || 'N/A',
            mobile: row.sender_mobile || 'N/A',
            // Detailed Data for Modal
            sender_name: row.sender_name,
            sender_mobile: row.sender_mobile,
            sender_address: row.sender_address,
            sender_pincode: row.sender_pincode,
            receiver_name: row.receiver_name,
            receiver_mobile: row.receiver_mobile,
            receiver_address: row.receiver_address,
            receiver_pincode: row.receiver_pincode,
            full_origin: row.origin_address,
            full_destination: row.destination_address,
            weight: parseFloat(row.weight || 1.0),
            created_at: row.created_at,
            updated_at: row.updated_at || row.created_at,
            estimated_delivery: row.estimated_delivery
        }));

        res.json({ success: true, shipments });
    } catch (err) {
        console.error("Dashboard Shipments Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
    }
});



// Create New Shipment
router.post('/admin/shipments/create', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const {
            sender_name, sender_mobile, sender_address, sender_pincode,
            receiver_name, receiver_mobile, receiver_address, receiver_pincode,
            origin, destination, price, weight, date
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
            INSERT INTO shipments(
                tracking_id,
                sender_name, sender_mobile, sender_address, sender_pincode,
                receiver_name, receiver_mobile, receiver_address, receiver_pincode,
                origin_address, destination_address,
                price, weight, status, created_at, estimated_delivery
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, 'pending', $14, $15)
            RETURNING id, tracking_id
            `;

        const values = [
            trackingId,
            sender_name, sender_mobile, sender_address, sender_pincode,
            receiver_name, receiver_mobile, receiver_address, receiver_pincode,
            origin, destination,
            parseFloat(price), parseFloat(weight || 1.0), createdAt, deliveryDate
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

// Update Shipment Status
router.post('/admin/shipments/update-status', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { tracking_id, status } = req.body;

        if (!tracking_id || !status) {
            return res.status(400).json({ success: false, error: 'Tracking ID and Status are required' });
        }

        const allowedStatuses = ['pending', 'in_transit', 'delivered', 'failed', 'returned'];
        const normalizedStatus = status.toLowerCase().replace(' ', '_');

        if (!allowedStatuses.includes(normalizedStatus)) {
            return res.status(400).json({ success: false, error: 'Invalid status value' });
        }

        const result = await db.query(
            "UPDATE shipments SET status = $1, updated_at = NOW() WHERE tracking_id = $2 RETURNING tracking_id",
            [normalizedStatus, tracking_id]
        );

        if (result.rowCount === 0) {
            console.warn(`[Shipment Update] Not Found: ${tracking_id}`);
            return res.status(404).json({ success: false, error: 'Shipment not found' });
        }

        console.log(`[Shipment Update] Success: ${tracking_id} -> ${normalizedStatus}`);
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});


// Get Bookings (Pending Shipments)
router.get('/admin/bookings', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const pendingRes = await db.query(`
            SELECT * FROM shipments 
            WHERE status = 'pending' 
            ORDER BY created_at ASC
        `);

        // Mock KPI data based on real counts
        const newRequests = pendingRes.rowCount;
        const scheduledToday = await db.query(`
            SELECT COUNT(*) FROM shipments 
            WHERE status = 'pending' 
            AND created_at >= CURRENT_DATE
        `);

        res.json({
            success: true,
            stats: {
                newRequests,
                scheduledToday: parseInt(scheduledToday.rows[0].count)
            },
            bookings: pendingRes.rows.map(row => ({
                id: row.tracking_id,
                sender: row.sender_name,
                sender_type: 'Member', // Placeholder or derive if user_id existed
                type: parseFloat(row.weight) < 1.0 ? 'Document' : 'Parcel',
                location: row.origin_address,
                time_slot: 'Standard Pickup', // Placeholder
                created_at: row.created_at,
                weight: row.weight
            }))
        });
    } catch (err) {
        console.error("Bookings API Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
});


// --- User Management ---

// Get All Users
router.get('/admin/users', validateSession, requireRole('admin'), async (req, res) => {
    try {
        // Fetch users (excluding password hashes)
        const result = await db.query(`
            SELECT id, full_name, username, role, status, phone, created_at 
            FROM users 
            ORDER BY created_at DESC
        `);

        res.json({
            success: true,
            users: result.rows.map(u => ({
                id: u.id,
                name: u.full_name || u.username,
                username: u.username,
                role: u.role,
                org: 'MoveX HQ', // Placeholder until org linkage is strictly defined
                status: u.status,
                joined: new Date(u.created_at).toLocaleDateString()
            }))
        });
    } catch (err) {
        console.error("Get Users Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch users' });
    }
});

// Create New User
router.post('/admin/users/create', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { full_name, username, password, role, phone } = req.body;

        if (!full_name || !username || !password || !role) {
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        // Check if username exists
        const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Username already taken' });
        }

        const hash = await bcrypt.hash(password, 12);
        const status = 'active';

        await db.query(`
            INSERT INTO users (full_name, username, password_hash, role, status, phone, created_at)
            VALUES ($1, $2, $3, $4, $5, $6, NOW())
        `, [full_name, username, hash, role, status, phone || null]);

        res.json({ success: true, message: 'User created successfully' });

    } catch (err) {
        console.error("Create User Error:", err);
        res.status(500).json({ success: false, error: 'Failed to create user' });
    }
});

// Update User Status
router.post('/admin/users/status', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !['active', 'disabled'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid parameters' });
        }

        await db.query('UPDATE users SET status = $1 WHERE id = $2', [status, id]);

        // If disabling, kill their sessions
        if (status === 'disabled') {
            await sessionStore.destroySessionsForUser(id);
        }

        res.json({ success: true, message: `User ${status}` });
    } catch (err) {
        console.error("Update User Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

// Admin Reset Password
router.post('/admin/users/reset-password', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { id, password } = req.body;
        if (!id || !password || password.length < 6) {
            return res.status(400).json({ success: false, error: 'Invalid parameters' });
        }

        const hash = await bcrypt.hash(password, 12);
        await db.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, id]);

        // Kill sessions so they must re-login with new password
        await sessionStore.destroySessionsForUser(id);

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error("Admin Reset Password Error:", err);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});

router.post('/logout', async (req, res) => {
    // 1. Destroy JWT Cookie (if any)
    res.clearCookie('movex_session', { path: '/' });

    try {
        // 2. Destroy Server Session via Cookie (Primary method)
        const sid = req.cookies?.['movex.sid'];
        if (sid) {
            console.log(`[Logout] Destroying session: ${sid}`);
            await sessionStore.destroySession(sid);
        } else {
            // 3. FALLBACK: Destroy sessions by User ID if Bearer token is provided
            // This is critical for Production environments (Koyeb/Cloudflare)
            const authHeader = req.headers.authorization;
            if (authHeader && authHeader.startsWith('Bearer ')) {
                const token = authHeader.substring(7);
                try {
                    const decoded = jwt.verify(token, process.env.JWT_SECRET);
                    const userId = decoded.userId || decoded.id;
                    if (userId) {
                        console.log(`[Logout] Fallback: Destroying sessions for User ID: ${userId}`);
                        await sessionStore.destroySessionsForUser(userId);
                    }
                } catch (jwtErr) {
                    console.log('[Logout] Fallback JWT verification failed or expired');
                }
            } else {
                console.log('[Logout] No session cookie or Bearer token found to destroy');
            }
        }
    } catch (err) {
        console.error("[Logout] Error during session destruction:", err);
    }

    // 4. Always clear the cookie with matching options
    clearSessionCookie(res);

    res.json({ success: true, message: 'Logged out successfully' });
});

module.exports = router;
