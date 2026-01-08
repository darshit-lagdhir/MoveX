const express = require('express');
const router = express.Router();
const db = require('../src/config/db');
const { validateSession, requireRole, clearSessionCookie } = require('../src/sessionMiddleware');
const sessionStore = require('../src/session'); // Needed for logout
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- RECOVERY/MIGRATION: Ensure staff columns exist ---
(async () => {
    try {
        await db.query(`
            ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_role TEXT;
            ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_status TEXT DEFAULT 'Active';
            UPDATE users SET staff_role = 'Warehouse Staff' WHERE staff_role = 'Warehouse Manager';
        `);
        console.log('[Migration] Staff columns verified.');
    } catch (e) {
        console.warn('[Migration] Staff columns check failed (might already exist):', e.message);
    }
})();

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
                type: parseFloat(row.weight) < 1.0 ? 'Document' : 'Parcel',
                location: row.origin_address,
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
        // Fetch users with organization names
        const result = await db.query(`
            SELECT u.id, u.full_name, u.username, u.role, u.status, u.phone, u.created_at, o.name as org_name
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            ORDER BY u.created_at DESC
        `);

        res.json({
            success: true,
            users: result.rows.map(u => ({
                id: u.id,
                name: u.full_name || u.username,
                username: u.username,
                role: u.role,
                org: u.org_name || 'MoveX HQ',
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

        if (password.length < 8) {
            return res.status(400).json({ success: false, error: 'Password must be at least 8 characters long' });
        }

        if (role === 'franchisee') {
            return res.status(400).json({ success: false, error: 'Franchisees must be created through the Franchise page' });
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
        const { username, status } = req.body;
        if (!username || !['active', 'disabled'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid parameters' });
        }

        await db.query('UPDATE users SET status = $1 WHERE username = $2', [status, username]);

        // If disabling, kill their sessions
        if (status === 'disabled') {
            await sessionStore.destroySessionsForUser(username);
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
        const { username, password } = req.body;
        if (!username || !password || password.length < 8) {
            return res.status(400).json({ success: false, error: 'Invalid parameters. Password must be at least 8 characters.' });
        }

        const hash = await bcrypt.hash(password, 12);
        await db.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);

        // Kill sessions so they must re-login with new password
        await sessionStore.destroySessionsForUser(username);

        res.json({ success: true, message: 'Password reset successfully' });
    } catch (err) {
        console.error("Admin Reset Password Error:", err);
        res.status(500).json({ success: false, error: 'Failed to reset password' });
    }
});

// --- FRANCHISE MANAGEMENT ---

// Get all franchises
router.get('/admin/franchises', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT o.*, u.username as owner_username, u.full_name as owner_name, u.phone as owner_phone
            FROM organizations o
            LEFT JOIN users u ON u.organization_id = o.id AND u.role = 'franchisee'
            WHERE o.type = 'franchise'
            ORDER BY o.created_at DESC
        `);
        res.json({ success: true, franchises: result.rows });
    } catch (err) {
        console.error("Fetch Franchises Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch franchises' });
    }
});

// Get franchise stats
router.get('/admin/franchises/stats', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const totalResult = await db.query("SELECT COUNT(*) FROM organizations WHERE type = 'franchise'");
        const pendingResult = await db.query("SELECT COUNT(*) FROM organizations WHERE type = 'franchise' AND status = 'pending'");
        const pincodesResult = await db.query("SELECT pincodes FROM organizations WHERE type = 'franchise' AND status = 'active'");

        const allPincodes = new Set();
        pincodesResult.rows.forEach(row => {
            if (row.pincodes) {
                row.pincodes.split(',').forEach(p => {
                    const cleanP = p.trim();
                    if (cleanP) allPincodes.add(cleanP);
                });
            }
        });

        res.json({
            success: true,
            stats: {
                total: parseInt(totalResult.rows[0].count),
                pending: parseInt(pendingResult.rows[0].count),
                activePincodes: allPincodes.size
            }
        });
    } catch (err) {
        console.error("Franchise Stats Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// Create Franchise (Org + User)
router.post('/admin/franchises/create', validateSession, requireRole('admin'), async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { name, non_serviceable_areas, pincodes, full_address, owner_name, owner_username, owner_password, owner_phone } = req.body;

        if (!name || !owner_name || !owner_username || !owner_password || !owner_phone) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        if (owner_password.length < 8) {
            return res.status(400).json({ success: false, error: 'Owner password must be at least 8 characters long' });
        }

        await client.query('BEGIN');

        // 1. Create Organization
        const orgResult = await client.query(
            'INSERT INTO organizations (name, type, non_serviceable_areas, pincodes, full_address, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id',
            [name, 'franchise', non_serviceable_areas || '', pincodes || '', full_address || '', 'active']
        );
        const orgId = orgResult.rows[0].id;

        // 2. Create Franchisee User
        const hash = await bcrypt.hash(owner_password, 12);
        await client.query(
            'INSERT INTO users (full_name, username, password_hash, role, organization_id, status, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [owner_name, owner_username.trim().toLowerCase(), hash, 'franchisee', orgId, 'active', owner_phone]
        );

        await client.query('COMMIT');
        res.json({ success: true, message: 'Franchise and Owner created successfully' });

    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Create Franchise Error:", err);
        if (err.code === '23505') {
            return res.status(400).json({ success: false, error: 'Username already exists' });
        }
        res.status(500).json({ success: false, error: 'Failed to create franchise' });
    } finally {
        client.release();
    }
});

// Update Franchise Status
router.post('/admin/franchises/status', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !['active', 'disabled', 'pending'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid parameters' });
        }

        await db.query('UPDATE organizations SET status = $1 WHERE id = $2', [status, id]);
        res.json({ success: true, message: `Franchise status updated to ${status}` });
    } catch (err) {
        console.error("Update Franchise Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

// Update Franchise Details
router.post('/admin/franchises/update', validateSession, requireRole('admin'), async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { id, name, non_serviceable_areas, pincodes, full_address, performance, owner_phone, owner_name, owner_username } = req.body;
        if (!id || !name) {
            return res.status(400).json({ success: false, error: 'ID and Name are required' });
        }

        await client.query('BEGIN');

        // 1. Update Organization
        await client.query(`
            UPDATE organizations 
            SET name = $1, non_serviceable_areas = $2, pincodes = $3, performance = $4, full_address = $5, updated_at = NOW() 
            WHERE id = $6
        `, [name, non_serviceable_areas || '', pincodes || '', performance || 0, full_address || '', id]);

        // 2. Update Owner Details (if any are provided)
        if (owner_phone || owner_name || owner_username) {
            const updates = [];
            const values = [];
            let i = 1;

            if (owner_name) {
                updates.push(`full_name = $${i++}`);
                values.push(owner_name);
            }
            if (owner_username) {
                updates.push(`username = $${i++}`);
                values.push(owner_username);
            }
            if (owner_phone) {
                updates.push(`phone = $${i++}`);
                values.push(owner_phone);
            }

            if (updates.length > 0) {
                values.push(id); // $i is current index, but we pushed i++ above. 
                // Wait, if updates.length is 3, i is 4. values[3] is id. So it's $4. Correct.
                await client.query(`
                    UPDATE users 
                    SET ${updates.join(', ')}, updated_at = NOW() 
                    WHERE organization_id = $${i} AND role = 'franchisee'
                `, values);
            }
        }

        await client.query('COMMIT');
        res.json({ success: true, message: 'Franchise updated successfully' });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Update Franchise Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update franchise' });
    } finally {
        client.release();
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

// Public API for checking serviceability (by Area Name or Indian Pincode)
router.get('/public/check-service/:query', async (req, res) => {
    try {
        const query = req.params.query.trim();
        if (!query) return res.status(400).json({ success: false, error: 'Search term required' });

        // Search logic:
        // 1. If it's a 6-digit number, prioritize pincode matching.
        // 2. Otherwise, match against Organization Name (Area).

        const result = await db.query(`
            SELECT o.name, o.full_address, u.phone as owner_phone
            FROM organizations o
            LEFT JOIN users u ON u.organization_id = o.id AND u.role = 'franchisee'
            WHERE o.type = 'franchise' AND o.status = 'active'
            AND (
                -- Search by Hub/Area Name
                o.name ILIKE $1 OR
                -- Search by Pincode (Robust matching for comma-separated list)
                o.pincodes = $2 OR 
                o.pincodes LIKE $2 || ',%' OR 
                o.pincodes LIKE '%, ' || $2 OR 
                o.pincodes LIKE '%, ' || $2 || ',%' OR
                o.pincodes LIKE '%,' || $2 OR 
                o.pincodes LIKE '%,' || $2 || ',%'
            )
            LIMIT 1
        `, [`%${query}%`, query]);

        if (result.rows.length > 0) {
            res.json({
                success: true,
                serviceable: true,
                details: result.rows[0]
            });
        } else {
            res.json({
                success: true,
                serviceable: false,
                message: 'Area or Pincode is not currently serviceable'
            });
        }
    } catch (err) {
        console.error("Check Service Error:", err);
        res.status(500).json({ success: false, error: 'Failed to verify serviceability' });
    }
});

// Public API: Get Serviceable Cities
router.get('/public/serviceable-cities', async (req, res) => {
    try {
        const { search } = req.query;
        let query = 'SELECT name FROM serviceable_cities';
        let params = [];

        if (search) {
            query += ' WHERE name ILIKE $1';
            params.push(`%${search.trim()}%`);
        }

        query += ' ORDER BY name ASC LIMIT 50'; // Limit results for performance

        const result = await db.query(query, params);
        res.json({
            success: true,
            cities: result.rows.map(r => r.name)
        });
    } catch (err) {
        console.error("Fetch Cities Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch cities' });
    }
});

// --- STAFF MANAGEMENT ---

// Get all staff
router.get('/admin/staff', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.id, u.full_name, u.username, u.staff_role, u.staff_status, u.phone, u.status as user_status, 
                   o.name as org_name, o.id as org_id
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.id
            WHERE u.role = 'staff'
            ORDER BY u.created_at DESC
        `);

        res.json({
            success: true,
            staff: result.rows.map(s => ({
                id: s.id,
                tracking_id: `MXSTF${String(s.id).padStart(3, '0')}`,
                name: s.full_name,
                username: s.username,
                role: s.staff_role || 'Staff Member',
                org: s.org_name || 'Unassigned Hub',
                org_id: s.org_id,
                status: s.staff_status || 'Active',
                user_status: s.user_status,
                contact: s.phone || 'No Contact'
            }))
        });
    } catch (err) {
        console.error("Fetch Staff Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
});

// Create Staff
router.post('/admin/staff/create', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { full_name, username, password, staff_role, phone, organization_id } = req.body;

        if (!full_name || !username || !password || !staff_role) {
            return res.status(400).json({ success: false, error: 'Name, Username, Password, and Role are required' });
        }

        const existing = await db.query('SELECT id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Username already taken' });
        }

        const hash = await bcrypt.hash(password, 12);

        await db.query(`
            INSERT INTO users (full_name, username, password_hash, role, staff_role, phone, organization_id, status, staff_status)
            VALUES ($1, $2, $3, 'staff', $4, $5, $6, 'active', 'Active')
        `, [full_name, username, hash, staff_role, phone || null, organization_id || null]);

        res.json({ success: true, message: 'Staff member created successfully' });
    } catch (err) {
        console.error("Create Staff Error:", err);
        res.status(500).json({ success: false, error: 'Failed to create staff' });
    }
});

// Update Staff
router.post('/admin/staff/update', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { id, full_name, staff_role, phone, organization_id, staff_status } = req.body;

        if (!id) return res.status(400).json({ success: false, error: 'Staff ID is required' });

        await db.query(`
            UPDATE users 
            SET full_name = COALESCE($1, full_name), 
                staff_role = COALESCE($2, staff_role), 
                phone = COALESCE($3, phone), 
                organization_id = $4,
                staff_status = COALESCE($5, staff_status),
                updated_at = NOW()
            WHERE id = $6 AND role = 'staff'
        `, [full_name, staff_role, phone, organization_id || null, staff_status, id]);

        res.json({ success: true, message: 'Staff updated successfully' });
    } catch (err) {
        console.error("Update Staff Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update staff' });
    }
});

// Update Staff User Status (Active/Disabled)
router.post('/admin/staff/status', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { id, status } = req.body;
        if (!id || !['active', 'disabled'].includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid parameters' });
        }

        await db.query("UPDATE users SET status = $1 WHERE id = $2 AND role = 'staff'", [status, id]);
        res.json({ success: true, message: `Staff account ${status}` });
    } catch (err) {
        console.error("Update Staff Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

// Logout - destroy current session only
router.post('/logout', validateSession, async (req, res) => {
    try {
        const sid = req.cookies?.['movex.sid'];
        if (sid) {
            await sessionStore.destroySession(sid);
        }
        clearSessionCookie(res);
        res.json({ success: true, message: 'Logged out successfully' });
    } catch (err) {
        console.error("Logout Error:", err);
        res.status(500).json({ success: false, error: 'Logout failed' });
    }
});

module.exports = router;
