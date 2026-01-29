const express = require('express');
const router = express.Router();
const db = require('../src/config/db');
const { validateSession, requireRole, clearSessionCookie } = require('../src/sessionMiddleware');
const sessionStore = require('../src/session'); // Needed for logout
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// --- RECOVERY/MIGRATION: Ensure staff columns exist ---
// Delayed execution to allow DB pool to stabilize
setTimeout(async () => {
    try {
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_role TEXT;`);
        await db.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS staff_status TEXT DEFAULT 'Active';`);
        // Consolidate all staff roles into one 'Staff' role per user request
        await db.query(`UPDATE users SET staff_role = 'Staff' WHERE role = 'staff';`);
        await db.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER;`);
    } catch (e) {
        if (process.env.NODE_ENV !== 'production') {
            console.error('[Migration] Column migration failed:', e.message);
        }
    }
}, 5000);

// ... [Existing Code] ...

// ═══════════════════════════════════════════════════════════
//  FRANCHISEE - TASK ASSIGNMENT
// ═══════════════════════════════════════════════════════════

// Manual Migration Endpoint - Call this once to add columns
router.get('/migrate/add-assignment-column', async (req, res) => {
    try {
        await db.query(`ALTER TABLE shipments ADD COLUMN IF NOT EXISTS assigned_staff_id INTEGER;`);
        res.json({ success: true, message: 'Migration completed - assigned_staff_id column added' });
    } catch (err) {
        console.error('Migration Error:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Debug endpoint to check statuses
router.get('/debug/shipment-statuses', async (req, res) => {
    try {
        const statuses = await db.query(`SELECT DISTINCT status, COUNT(*) as count FROM shipments GROUP BY status`);
        const pincodes = await db.query(`SELECT organization_id, name, pincodes FROM organizations`);
        const sample = await db.query(`SELECT tracking_id, status, receiver_pincode, organization_id, assigned_staff_id FROM shipments ORDER BY created_at DESC LIMIT 10`);
        const staff = await db.query(`SELECT user_id, username, full_name, organization_id FROM users WHERE role = 'staff'`);
        res.json({
            success: true,
            statuses: statuses.rows,
            organizations: pincodes.rows,
            recentShipments: sample.rows,
            staffMembers: staff.rows
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// Get shipments available for assignment (At hub, not delivered, not yet assigned)
router.get('/franchisee/assignments/available', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        // 1. Get Franchisee's Pincodes
        const orgRes = await db.query('SELECT pincodes FROM organizations WHERE organization_id = $1', [orgId]);
        if (orgRes.rows.length === 0) return res.status(404).json({ success: false, error: 'Organization not found' });

        const pincodeStr = orgRes.rows[0].pincodes || '';
        const pincodes = pincodeStr.split(',').map(p => p.trim()).filter(Boolean);

        if (pincodes.length === 0) {
            // Fallback: If no pincodes, only show created by self (intra-city fallback)
            const result = await db.query(`
                SELECT tracking_id, sender_name, receiver_name, destination_address, status, created_at, weight
                FROM shipments 
                WHERE organization_id = $1 
                AND LOWER(status) = 'reached at final delivery hub'
                ORDER BY created_at DESC
            `, [orgId]);
            return res.json({ success: true, shipments: result.rows });
        }

        // 2. Query based on Receiver Pincode coverage
        const placeholders = pincodes.map((_, i) => `$${i + 1}`).join(', ');

        // We match if receiver_pincode is in our list OR if we created it (local/backup)
        // AND status is correct (case-insensitive)
        const query = `
            SELECT tracking_id, sender_name, receiver_name, destination_address, status, created_at, weight
            FROM shipments 
            WHERE (receiver_pincode IN (${placeholders}) OR organization_id = $${pincodes.length + 1})
            AND LOWER(status) = 'reached at final delivery hub'
            ORDER BY created_at DESC
        `;

        const result = await db.query(query, [...pincodes, orgId]);

        res.json({ success: true, shipments: result.rows });
    } catch (err) {
        console.error("Fetch Available Shipments Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
    }
});

// Bulk Assign Shipments to Staff
router.post('/franchisee/assign', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const { tracking_ids, staff_id } = req.body;
        const orgId = req.organization?.id;

        if (!tracking_ids || !Array.isArray(tracking_ids) || tracking_ids.length === 0) {
            return res.status(400).json({ success: false, error: 'No shipments selected' });
        }
        if (!staff_id) {
            return res.status(400).json({ success: false, error: 'Staff member is required' });
        }

        // Verify staff belongs to this org
        const staffCheck = await db.query('SELECT user_id FROM users WHERE user_id = $1 AND organization_id = $2', [staff_id, orgId]);
        if (staffCheck.rows.length === 0) {
            return res.status(400).json({ success: false, error: 'Invalid staff member selected' });
        }

        // Update shipments
        // optional: change status to 'out_for_delivery' or keep current? 
        // User said: "assign them to deliver". Usually this implies moving to 'out_for_delivery' or just 'assigned'.
        // Let's just assign them for now. Staff can mark them 'Out for Delivery' or we can do it here.
        // Let's sets assigned_staff_id. 

        const placeholders = tracking_ids.map((_, i) => `$${i + 2}`).join(', ');
        const query = `
            UPDATE shipments 
            SET assigned_staff_id = $1, updated_at = NOW()
            WHERE tracking_id IN (${placeholders}) 
            AND organization_id = $${tracking_ids.length + 2}
        `;

        await db.query(query, [staff_id, ...tracking_ids, orgId]);

        res.json({ success: true, message: `Assigned ${tracking_ids.length} shipments to staff.` });

    } catch (err) {
        console.error("Assign Shipments Error:", err);
        res.status(500).json({ success: false, error: 'Failed to assign shipments' });
    }
});

// ═══════════════════════════════════════════════════════════
//  STAFF - DASHBOARD STATS (LIVE DATA)
// ═══════════════════════════════════════════════════════════

router.get('/staff/stats', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const userId = req.session.userId;

        // Pending Tasks (assigned to this staff, at hub status)
        const pendingRes = await db.query(`
            SELECT COUNT(*) FROM shipments 
            WHERE assigned_staff_id = $1 
            AND LOWER(status) IN ('reached at final delivery hub', 'pending', 'in_transit')
        `, [userId]);

        // Out for Delivery
        const outRes = await db.query(`
            SELECT COUNT(*) FROM shipments 
            WHERE assigned_staff_id = $1 
            AND LOWER(status) = 'out for delivery'
        `, [userId]);

        // Delivered Today
        const deliveredRes = await db.query(`
            SELECT COUNT(*) FROM shipments 
            WHERE assigned_staff_id = $1 
            AND LOWER(status) = 'delivered'
            AND DATE(updated_at) = CURRENT_DATE
        `, [userId]);

        res.json({
            success: true,
            stats: {
                pendingTasks: parseInt(pendingRes.rows[0].count) || 0,
                outForDelivery: parseInt(outRes.rows[0].count) || 0,
                deliveredToday: parseInt(deliveredRes.rows[0].count) || 0
            }
        });
    } catch (err) {
        console.error("Staff Stats Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});

// Get Shipments at Hub (Active) --> UPDATED FOR STAFF VIEW
router.get('/staff/shipments', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const userId = req.session.userId;

        // Show all shipments assigned to this staff member that are still actionable
        // Only exclude: delivered, cancelled, returned
        const result = await db.query(`
            SELECT tracking_id, sender_name, sender_phone, sender_address, 
                   receiver_name, receiver_phone, receiver_address,
                   origin_address, destination_address, status, created_at, weight
            FROM shipments
            WHERE assigned_staff_id = $1
            AND LOWER(status) NOT IN ('delivered', 'cancelled', 'returned')
            ORDER BY created_at ASC
        `, [userId]);

        const shipments = result.rows.map(row => ({
            id: row.tracking_id,
            tracking_id: row.tracking_id,
            sender: row.sender_name,
            sender_phone: row.sender_phone,
            sender_address: row.sender_address,
            receiver: row.receiver_name,
            receiver_phone: row.receiver_phone,
            receiver_address: row.receiver_address,
            origin: row.origin_address,
            destination: row.destination_address,
            status: row.status.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase()),
            date: row.created_at,
            weight: row.weight
        }));

        res.json({ success: true, shipments });
    } catch (err) {
        console.error("Staff Shipments Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
    }
});

// Staff Bulk Update Status
router.post('/staff/shipments/bulk-update', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const userId = req.session.userId;
        const { tracking_ids, status } = req.body;

        if (!tracking_ids || !Array.isArray(tracking_ids) || tracking_ids.length === 0) {
            return res.status(400).json({ success: false, error: 'No shipments selected' });
        }

        const validStatuses = ['Out for Delivery', 'Delivered', 'Not Delivered'];
        if (!status || !validStatuses.includes(status)) {
            return res.status(400).json({ success: false, error: 'Invalid status. Use: Out for Delivery, Delivered, or Not Delivered' });
        }

        // Update only shipments assigned to this staff member
        const placeholders = tracking_ids.map((_, i) => `$${i + 3}`).join(', ');
        const query = `
            UPDATE shipments 
            SET status = $1, updated_at = NOW()
            WHERE assigned_staff_id = $2 
            AND tracking_id IN (${placeholders})
        `;

        const result = await db.query(query, [status, userId, ...tracking_ids]);

        res.json({ success: true, updated: result.rowCount });
    } catch (err) {
        console.error("Staff Bulk Update Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update shipments' });
    }
});

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
                shipmentTrend: `+ ${parseInt(todayCount.rows[0].count)} Today`,
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
            SELECT shipment_id, tracking_id, status,
    sender_name, sender_phone, sender_address, sender_pincode,
    receiver_name, receiver_phone, receiver_address, receiver_pincode,
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
            mobile: row.sender_phone || 'N/A',
            // Detailed Data for Modal
            sender_name: row.sender_name,
            sender_mobile: row.sender_phone,
            sender_address: row.sender_address,
            sender_pincode: row.sender_pincode,
            receiver_name: row.receiver_name,
            receiver_mobile: row.receiver_phone,
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
            sender_name, sender_phone, sender_address, sender_pincode, sender_city,
            receiver_name, receiver_phone, receiver_address, receiver_pincode, receiver_city,
            price, weight, contents
        } = req.body;

        // Mandatory Field Check
        if (!sender_name || !sender_phone || !sender_address || !sender_pincode ||
            !receiver_name || !receiver_phone || !receiver_address || !receiver_pincode ||
            !price || !weight) {
            return res.status(400).json({ success: false, error: 'All fields are mandatory' });
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(sender_phone) || !phoneRegex.test(receiver_phone)) {
            return res.status(400).json({ success: false, error: 'Phone numbers must be exactly 10 digits' });
        }

        const pincodeRegex = /^[0-9]{6}$/;
        if (!pincodeRegex.test(sender_pincode) || !pincodeRegex.test(receiver_pincode)) {
            return res.status(400).json({ success: false, error: 'Pincodes must be exactly 6 digits' });
        }

        const amountRegex = /^\d+(\.\d{1,2})?$/;
        if (!amountRegex.test(String(price))) {
            return res.status(400).json({ success: false, error: 'Amount must be a valid number' });
        }

        // Check if pincodes are serviceable
        const senderPincodeCheck = await db.query(`
            SELECT organization_id FROM organizations 
            WHERE status = 'active' AND pincodes LIKE '%' || $1 || '%'
            LIMIT 1
        `, [sender_pincode]);

        if (senderPincodeCheck.rows.length === 0) {
            return res.status(400).json({ success: false, error: `Sender pincode ${sender_pincode} is not serviceable. No franchise covers this area.` });
        }

        const receiverPincodeCheck = await db.query(`
            SELECT organization_id FROM organizations 
            WHERE status = 'active' AND pincodes LIKE '%' || $1 || '%'
            LIMIT 1
        `, [receiver_pincode]);

        if (receiverPincodeCheck.rows.length === 0) {
            return res.status(400).json({ success: false, error: `Receiver pincode ${receiver_pincode} is not serviceable. No franchise covers this area.` });
        }

        // Generate Sequential Tracking ID
        const maxIdResult = await db.query("SELECT tracking_id FROM shipments WHERE tracking_id ~ '^MX[0-9]+$' ORDER BY tracking_id DESC LIMIT 1");

        let nextNum = 10001; // Start from 10001 if empty
        if (maxIdResult.rows.length > 0) {
            const lastId = maxIdResult.rows[0].tracking_id;
            const numPart = parseInt(lastId.replace('MX', ''), 10);
            if (!isNaN(numPart)) {
                nextNum = numPart + 1;
            }
        }

        const trackingId = `MX${nextNum}`;

        // Calculate estimated delivery
        const createdAt = new Date();
        const deliveryDate = new Date(createdAt);
        deliveryDate.setDate(deliveryDate.getDate() + Math.floor(Math.random() * 4) + 2);

        // Build addresses
        const origin_address = sender_city ? `${sender_city}, ${sender_pincode}` : sender_pincode;
        const destination_address = receiver_city ? `${receiver_city}, ${receiver_pincode}` : receiver_pincode;

        const queryText = `
            INSERT INTO shipments(
                tracking_id,
                sender_name, sender_phone, sender_address, sender_pincode,
                receiver_name, receiver_phone, receiver_address, receiver_pincode,
                origin_address, destination_address,
                price, weight, contents, status, created_at, estimated_delivery
            ) VALUES($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'pending', NOW(), $15)
            RETURNING shipment_id, tracking_id
        `;

        const values = [
            trackingId,
            sender_name, sender_phone, sender_address, sender_pincode,
            receiver_name, receiver_phone, receiver_address, receiver_pincode,
            origin_address, destination_address,
            parseFloat(price), parseFloat(weight || 1.0), contents || '', deliveryDate
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
            console.warn(`[Shipment Update] Not Found: ${tracking_id} `);
            return res.status(404).json({ success: false, error: 'Shipment not found' });
        }

        console.log(`[Shipment Update]Success: ${tracking_id} -> ${normalizedStatus} `);
        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error("Update Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});





// --- User Management ---

// Get All Users
router.get('/admin/users', validateSession, requireRole('admin'), async (req, res) => {
    try {
        // Fetch users with organization names
        const result = await db.query(`
            SELECT u.user_id, u.full_name, u.username, u.role, u.status, u.phone, u.created_at, o.name as org_name
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.organization_id
            ORDER BY u.created_at DESC
    `);

        res.json({
            success: true,
            users: result.rows.map(u => ({
                id: u.user_id,
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
            return res.status(400).json({ success: false, error: 'Mandatory fields missing' });
        }

        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
        if (cleanPhone && cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
        }

        // Check if username exists
        const existing = await db.query('SELECT user_id FROM users WHERE username = $1', [username]);
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
            INSERT INTO users(full_name, username, password_hash, role, status, phone, created_at)
VALUES($1, $2, $3, $4, $5, $6, NOW())
        `, [full_name, username, hash, role, status, cleanPhone]);

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

        res.json({ success: true, message: `User ${status} ` });
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
            LEFT JOIN users u ON u.organization_id = o.organization_id AND u.role = 'franchisee'
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
            return res.status(400).json({ success: false, error: 'All fields are required' });
        }

        const cleanOwnerPhone = owner_phone.replace(/[^0-9]/g, '');
        if (cleanOwnerPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Owner phone must be exactly 10 digits' });
        }

        if (owner_password.length < 8) {
            return res.status(400).json({ success: false, error: 'Owner password must be at least 8 characters long' });
        }

        await client.query('BEGIN');

        // 1. Create Organization
        const orgResult = await client.query(
            'INSERT INTO organizations (name, type, non_serviceable_areas, pincodes, full_address, status) VALUES ($1, $2, $3, $4, $5, $6) RETURNING organization_id',
            [name, 'franchise', non_serviceable_areas || '', pincodes || '', full_address || '', 'active']
        );
        const orgId = orgResult.rows[0].organization_id;

        // 2. Create Franchisee User
        const hash = await bcrypt.hash(owner_password, 12);
        await client.query(
            'INSERT INTO users (full_name, username, password_hash, role, organization_id, status, phone) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [owner_name, owner_username.trim().toLowerCase(), hash, 'franchisee', orgId, 'active', cleanOwnerPhone]
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

        await db.query('UPDATE organizations SET status = $1 WHERE organization_id = $2', [status, id]);
        res.json({ success: true, message: `Franchise status updated to ${status} ` });
    } catch (err) {
        console.error("Update Franchise Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

// Delete Franchise (Permanently removes organization and unlinks users)
router.delete('/admin/franchises/:id', validateSession, requireRole('admin'), async (req, res) => {
    const client = await db.pool.connect();
    try {
        const { id } = req.params;
        if (!id) {
            return res.status(400).json({ success: false, error: 'Franchise ID is required' });
        }

        await client.query('BEGIN');

        // 1. Unlink any users associated with this franchise (set their organization_id to NULL)
        await client.query('UPDATE users SET organization_id = NULL WHERE organization_id = $1', [id]);

        // 2. Delete the organization
        const result = await client.query('DELETE FROM organizations WHERE organization_id = $1 RETURNING name', [id]);

        if (result.rowCount === 0) {
            await client.query('ROLLBACK');
            return res.status(404).json({ success: false, error: 'Franchise not found' });
        }

        await client.query('COMMIT');
        res.json({ success: true, message: `Franchise "${result.rows[0].name}" deleted successfully` });
    } catch (err) {
        await client.query('ROLLBACK');
        console.error("Delete Franchise Error:", err);
        res.status(500).json({ success: false, error: 'Failed to delete franchise' });
    } finally {
        client.release();
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
            WHERE organization_id = $6
    `, [name, non_serviceable_areas || '', pincodes || '', performance || 0, full_address || '', id]);

        // 2. Update Owner Details (if any are provided)
        if (owner_phone || owner_name || owner_username) {
            const updates = [];
            const values = [];
            let i = 1;

            if (owner_name) {
                updates.push(`full_name = $${i++} `);
                values.push(owner_name);
            }
            if (owner_username) {
                updates.push(`username = $${i++} `);
                values.push(owner_username);
            }

            const cleanOwnerPhone = owner_phone ? owner_phone.replace(/[^0-9]/g, '') : null;
            if (cleanOwnerPhone) {
                if (cleanOwnerPhone.length !== 10) {
                    return res.status(400).json({ success: false, error: 'Owner phone must be exactly 10 digits' });
                }
                updates.push(`phone = $${i++} `);
                values.push(cleanOwnerPhone);
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
            console.log(`[Logout] Destroying session: ${sid} `);
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
                        console.log(`[Logout] Fallback: Destroying sessions for User ID: ${userId} `);
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
            LEFT JOIN users u ON u.organization_id = o.organization_id AND u.role = 'franchisee'
            WHERE o.type = 'franchise' AND o.status = 'active'
AND(
    --Search by Hub / Area Name
                o.name ILIKE $1 OR
                --Search by Pincode(Robust matching for comma - separated list)
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



// --- STAFF MANAGEMENT ---

// Get all staff
router.get('/admin/staff', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT u.user_id, u.full_name, u.username, u.staff_role, u.staff_status, u.phone, u.status as user_status,
    o.name as org_name, o.organization_id as org_id
            FROM users u
            LEFT JOIN organizations o ON u.organization_id = o.organization_id
            WHERE u.role = 'staff'
            ORDER BY u.created_at DESC
        `);

        res.json({
            success: true,
            staff: result.rows.map(s => ({
                id: s.user_id,
                tracking_id: `MXSTF${String(s.user_id).padStart(3, '0')} `,
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
            return res.status(400).json({ success: false, error: 'Mandatory fields missing' });
        }

        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
        if (cleanPhone && cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
        }

        const existing = await db.query('SELECT user_id FROM users WHERE username = $1', [username]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ success: false, error: 'Username already taken' });
        }

        const hash = await bcrypt.hash(password, 12);

        await db.query(`
            INSERT INTO users(full_name, username, password_hash, role, staff_role, phone, organization_id, status, staff_status)
VALUES($1, $2, $3, 'staff', $4, $5, $6, 'active', 'Active')
    `, [full_name, username, hash, staff_role, cleanPhone, organization_id || null]);

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

        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
        if (cleanPhone && cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
        }

        await db.query(`
            UPDATE users 
            SET full_name = COALESCE($1, full_name),
    staff_role = COALESCE($2, staff_role),
    phone = $3,
    organization_id = $4,
    staff_status = COALESCE($5, staff_status),
    updated_at = NOW()
            WHERE user_id = $6 AND role = 'staff'
    `, [full_name, staff_role, cleanPhone, organization_id || null, staff_status, id]);

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

        await db.query("UPDATE users SET status = $1 WHERE user_id = $2 AND role = 'staff'", [status, id]);
        res.json({ success: true, message: `Staff account ${status} ` });
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

// --- FINANCE & REVENUE ---

// Get Financial Stats
router.get('/admin/finance/stats', validateSession, requireRole('admin'), async (req, res) => {
    try {
        // Total Revenue (Sum of all shipment prices)
        const revenueRes = await db.query('SELECT SUM(price) as total FROM shipments');
        const totalRevenue = parseFloat(revenueRes.rows[0].total || 0);

        // Pending Revenue (Sum of price for shipments not delivered/cancelled)
        const pendingRes = await db.query("SELECT SUM(price) as total FROM shipments WHERE status NOT IN ('delivered', 'cancelled', 'returned', 'failed')");
        const pendingRevenue = parseFloat(pendingRes.rows[0].total || 0);

        // Real Data Payouts: 0 (No table yet, returned as 0 per 'Real Data' rule)
        const payouts = 0;

        res.json({
            success: true,
            stats: {
                totalRevenue,
                pendingRevenue,
                payouts
            }
        });
    } catch (e) {
        console.error("Finance Stats Error:", e);
        res.status(500).json({ success: false, error: 'Failed to fetch finance stats' });
    }
});

// Get Revenue History (Chart Data) - Last 6 Months
router.get('/admin/finance/history', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT TO_CHAR(created_at, 'Mon') as month, SUM(price) as revenue
            FROM shipments
            WHERE created_at >= NOW() - INTERVAL '6 months'
            GROUP BY TO_CHAR(created_at, 'Mon'), DATE_TRUNC('month', created_at)
            ORDER BY DATE_TRUNC('month', created_at) ASC
    `);

        const labels = result.rows.map(r => r.month);
        const data = result.rows.map(r => parseFloat(r.revenue || 0));

        res.json({ success: true, labels, data });
    } catch (e) {
        console.error("Finance History Error:", e);
        res.status(500).json({ success: false, error: 'Failed to fetch history' });
    }
});

// Get Recent Transactions (Shipments as transactions)
router.get('/admin/finance/transactions', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const result = await db.query(`
            SELECT tracking_id, created_at, price, sender_name, status 
            FROM shipments 
            ORDER BY created_at DESC 
            LIMIT 10
        `);

        const transactions = result.rows.map(r => ({
            ref_id: r.tracking_id,
            date: r.created_at,
            type: 'Shipment Credited',
            entity: `Client: ${r.sender_name || 'Walk-in'} `,
            amount: parseFloat(r.price || 0),
            status: r.status === 'delivered' ? 'Paid' : 'Pending'
        }));

        res.json({ success: true, transactions });
    } catch (e) {
        console.error("Finance Transactions Error:", e);
        res.status(500).json({ success: false, error: 'Failed to fetch transactions' });
    }
});

// Reports Page Stats
router.get('/admin/reports/stats', validateSession, requireRole('admin'), async (req, res) => {
    try {
        const { startDate, endDate } = req.query;
        let dateClause = '';
        let params = [];

        // Validate Dates YYYY-MM-DD
        if (startDate && endDate) {
            dateClause = 'WHERE DATE(created_at) >= $1 AND DATE(created_at) <= $2';
            params = [startDate, endDate];
        }

        // 1. KPI: Delivery Success Rate (Percentage of Delivered vs Total in range)
        let kpi1Query = `
            SELECT 
                COUNT(*) FILTER (WHERE status = 'delivered') as delivered,
                COUNT(*) as total
            FROM shipments
        `;
        if (dateClause) kpi1Query += ' ' + dateClause;

        const successRes = await db.query(kpi1Query, params);
        const total = parseInt(successRes.rows[0].total) || 0;
        const delivered = parseInt(successRes.rows[0].delivered) || 0;
        const successRate = total > 0 ? ((delivered / total) * 100).toFixed(1) + '%' : '0%';

        // 2. KPI: Avg Delivery Time (Only for items delivered in range)
        let kpi2Query = `
            SELECT AVG(EXTRACT(EPOCH FROM (updated_at - created_at))/86400) as avg_days 
            FROM shipments 
            WHERE status = 'delivered'
        `;
        if (dateClause) kpi2Query += ' AND ' + dateClause.replace('WHERE', ''); // Append date condition

        const timeRes = await db.query(kpi2Query, params);
        const avgDays = timeRes.rows[0].avg_days
            ? parseFloat(timeRes.rows[0].avg_days).toFixed(1) + ' Days'
            : 'N/A';

        // 3. Table: Daily Operations Report
        let tableQuery = `
            SELECT 
                to_char(created_at, 'Mon DD, YYYY') as date,
                COUNT(*) as total_shipments,
                COUNT(*) FILTER (WHERE status = 'delivered') as completed,
                COUNT(*) FILTER (WHERE status IN ('failed', 'returned')) as issues,
                COALESCE(SUM(price), 0) as revenue
            FROM shipments
        `;
        if (dateClause) tableQuery += ' ' + dateClause;

        tableQuery += `
            GROUP BY DATE(created_at), to_char(created_at, 'Mon DD, YYYY')
            ORDER BY DATE(created_at) DESC
        `;

        // If no filter, limit to 30 days by default
        if (!dateClause) tableQuery += ' LIMIT 30';

        const historyRes = await db.query(tableQuery, params);

        res.json({
            success: true,
            data: {
                successRate,
                avgDeliveryTime: avgDays,
                history: historyRes.rows
            }
        });

    } catch (err) {
        console.error('Error fetching reports stats:', err);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// --- FRANCHISEE DASHBOARD ---

// Get Franchisee Stats
router.get('/franchisee/stats', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        const totalShipmentsRes = await db.query('SELECT COUNT(*) FROM shipments WHERE organization_id = $1', [orgId]);
        const pendingPickupsRes = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1 AND status = 'pending'", [orgId]);
        const deliveredTodayRes = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1 AND status = 'delivered' AND updated_at >= NOW() - INTERVAL '24 HOURS'", [orgId]);
        const revenueRes = await db.query('SELECT SUM(price) FROM shipments WHERE organization_id = $1', [orgId]);

        // Monthly Revenue
        const monthlyRevenueRes = await db.query(`
            SELECT SUM(price) FROM shipments 
            WHERE organization_id = $1 
            AND created_at >= DATE_TRUNC('month', NOW())
        `, [orgId]);

        res.json({
            success: true,
            stats: {
                totalShipments: parseInt(totalShipmentsRes.rows[0].count),
                pendingPickups: parseInt(pendingPickupsRes.rows[0].count),
                deliveredToday: parseInt(deliveredTodayRes.rows[0].count),
                totalRevenue: parseFloat(revenueRes.rows[0].sum || 0),
                monthlyRevenue: parseFloat(monthlyRevenueRes.rows[0].sum || 0),
                payouts: 0 // Mock for now
            }
        });
    } catch (err) {
        console.error("Franchisee Stats Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch franchisee stats' });
    }
});

// Get Franchisee Shipments (Full Data for CRUD)
router.get('/franchisee/shipments', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        // Return ALL shipments for this franchise (no limit by default)
        const result = await db.query(`
            SELECT 
                shipment_id, tracking_id, status,
                sender_name, sender_phone, sender_address, sender_pincode,
                receiver_name, receiver_phone, receiver_address, receiver_pincode,
                origin_address, destination_address,
                price, weight,
                created_at, updated_at, estimated_delivery,
                organization_id
            FROM shipments 
            WHERE organization_id = $1 
            ORDER BY created_at DESC
        `, [orgId]);

        const shipments = result.rows.map(row => ({
            shipment_id: row.shipment_id,
            tracking_id: row.tracking_id,
            id: row.tracking_id,
            status: row.status ? row.status.charAt(0).toUpperCase() + row.status.slice(1).replace('_', ' ') : 'Pending',
            // Sender
            sender_name: row.sender_name,
            sender: row.sender_name,
            sender_phone: row.sender_phone,
            sender_address: row.sender_address,
            sender_pincode: row.sender_pincode,
            sender_city: row.origin_address ? row.origin_address.split(',')[0].trim() : '',
            // Receiver  
            receiver_name: row.receiver_name,
            receiver_phone: row.receiver_phone,
            receiver_address: row.receiver_address,
            receiver_pincode: row.receiver_pincode,
            receiver_city: row.destination_address ? row.destination_address.split(',')[0].trim() : '',
            // Locations
            origin: row.origin_address,
            destination: row.destination_address,
            // Package
            amount: parseFloat(row.price || 0),
            price: parseFloat(row.price || 0),
            weight: parseFloat(row.weight || 0),
            contents: row.contents || '',
            // Dates
            created_at: row.created_at,
            date: row.created_at,
            updated_at: row.updated_at,
            estimated_delivery: row.estimated_delivery
        }));

        res.json({ success: true, shipments });
    } catch (err) {
        console.error("Franchisee Shipments Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch shipments' });
    }
});

// Update Shipment Status (for Franchisee)
router.post('/franchisee/shipments/update-status', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const { tracking_id, status } = req.body;
        const orgId = req.organization?.id;

        if (!tracking_id || !status) {
            return res.status(400).json({ success: false, error: 'Missing parameters' });
        }

        // Verify ownership
        const verify = await db.query('SELECT organization_id FROM shipments WHERE tracking_id = $1', [tracking_id]);
        if (verify.rows.length === 0 || verify.rows[0].organization_id != orgId) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        await db.query('UPDATE shipments SET status = $1, updated_at = NOW() WHERE tracking_id = $2', [status.toLowerCase(), tracking_id]);
        res.json({ success: true, message: 'Status updated' });
    } catch (err) {
        console.error("Franchisee Update Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update' });
    }
});

// Get Franchisee Bookings
router.get('/franchisee/bookings', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        const result = await db.query(`
            SELECT * FROM shipments 
            WHERE organization_id = $1 AND status = 'pending'
            ORDER BY created_at DESC
        `, [orgId]);

        const bookings = result.rows.map(row => ({
            id: row.tracking_id,
            sender: row.sender_name,
            type: 'Standard', // Mock
            weight: row.weight,
            date: row.created_at
        }));

        res.json({ success: true, bookings, stats: { newRequests: bookings.length, scheduledToday: 0 } });
    } catch (err) {
        console.error("Franchisee Bookings Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch bookings' });
    }
});

// Get Franchisee Staff
router.get('/franchisee/staff', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        const result = await db.query(`
            SELECT * FROM users 
            WHERE organization_id = $1 AND role = 'staff'
            ORDER BY created_at DESC
        `, [orgId]);

        const staff = result.rows.map(row => ({
            user_id: row.user_id,
            id: row.user_id,
            full_name: row.full_name,
            name: row.full_name,
            username: row.username,
            phone: row.phone,
            staff_role: row.staff_role || 'Staff',
            role: row.staff_role || 'Staff',
            status: row.staff_status || 'Active'
        }));

        res.json({ success: true, staff });
    } catch (err) {
        console.error("Franchisee Staff Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch staff' });
    }
});

// ═══════════════════════════════════════════════════════════
//  FRANCHISEE - CREATE SHIPMENT
// ═══════════════════════════════════════════════════════════
router.post('/franchisee/shipments/create', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        const {
            sender_name, sender_phone, sender_address, sender_pincode, sender_city,
            receiver_name, receiver_phone, receiver_address, receiver_pincode, receiver_city,
            weight, amount
        } = req.body;

        // Validation
        if (!sender_name || !sender_phone || !sender_address || !sender_pincode ||
            !receiver_name || !receiver_phone || !receiver_address || !receiver_pincode ||
            !weight || !amount) {
            return res.status(400).json({ success: false, error: 'Missing required fields' });
        }

        const phoneRegex = /^[0-9]{10}$/;
        if (!phoneRegex.test(sender_phone) || !phoneRegex.test(receiver_phone)) {
            return res.status(400).json({ success: false, error: 'Phone numbers must be exactly 10 digits' });
        }

        const pincodeRegex = /^[0-9]{6}$/;
        if (!pincodeRegex.test(sender_pincode) || !pincodeRegex.test(receiver_pincode)) {
            return res.status(400).json({ success: false, error: 'Pincodes must be exactly 6 digits' });
        }

        // Check if pincodes are serviceable
        const senderPincodeCheck = await db.query(`
            SELECT organization_id FROM organizations 
            WHERE status = 'active' AND pincodes LIKE '%' || $1 || '%'
            LIMIT 1
        `, [sender_pincode]);

        if (senderPincodeCheck.rows.length === 0) {
            return res.status(400).json({ success: false, error: `Sender pincode ${sender_pincode} is not serviceable. No franchise covers this area.` });
        }

        const receiverPincodeCheck = await db.query(`
            SELECT organization_id FROM organizations 
            WHERE status = 'active' AND pincodes LIKE '%' || $1 || '%'
            LIMIT 1
        `, [receiver_pincode]);

        if (receiverPincodeCheck.rows.length === 0) {
            return res.status(400).json({ success: false, error: `Receiver pincode ${receiver_pincode} is not serviceable. No franchise covers this area.` });
        }

        // Generate Sequential Tracking ID
        const maxIdResult = await db.query("SELECT tracking_id FROM shipments WHERE tracking_id ~ '^MX[0-9]+$' ORDER BY tracking_id DESC LIMIT 1");

        let nextNum = 10001;
        if (maxIdResult.rows.length > 0) {
            const lastId = maxIdResult.rows[0].tracking_id;
            const numPart = parseInt(lastId.replace('MX', ''), 10);
            if (!isNaN(numPart)) {
                nextNum = numPart + 1;
            }
        }
        const tracking_id = `MX${nextNum}`;

        // Build origin/destination address strings
        const origin_address = sender_city ? `${sender_city}, ${sender_pincode}` : sender_pincode;
        const destination_address = receiver_city ? `${receiver_city}, ${receiver_pincode}` : receiver_pincode;

        // Auto-status logic for same-hub deliveries
        let initialStatus = 'Pending';
        if (sender_pincode && receiver_pincode && (sender_pincode.toString().trim() === receiver_pincode.toString().trim())) {
            initialStatus = 'Reached at Final Delivery Hub';
        }

        // Insert shipment
        const result = await db.query(`
            INSERT INTO shipments (
                tracking_id, status, organization_id, creator_username,
                sender_name, sender_phone, sender_address, sender_pincode,
                receiver_name, receiver_phone, receiver_address, receiver_pincode,
                origin_address, destination_address,
                weight, price,
                created_at, updated_at
            ) VALUES (
                $1, $16, $2, $3,
                $4, $5, $6, $7,
                $8, $9, $10, $11,
                $12, $13,
                $14, $15,
                NOW(), NOW()
            ) RETURNING shipment_id, tracking_id
        `, [
            tracking_id, orgId, req.session.username,
            sender_name, sender_phone, sender_address, sender_pincode,
            receiver_name, receiver_phone, receiver_address, receiver_pincode,
            origin_address, destination_address,
            weight, amount,
            initialStatus
        ]);
        res.json({
            success: true,
            message: 'Shipment created successfully',
            shipment_id: result.rows[0].shipment_id,
            tracking_id: result.rows[0].tracking_id
        });
    } catch (err) {
        console.error("Franchisee Create Shipment Error:", err);
        res.status(500).json({ success: false, error: 'Failed to create shipment' });
    }
});

// ═══════════════════════════════════════════════════════════
//  FRANCHISEE - PICKUP REQUESTS (Based on Assigned Pincodes)
// ═══════════════════════════════════════════════════════════
router.get('/franchisee/pickup-requests', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        // Get franchise's assigned pincodes
        const orgResult = await db.query('SELECT pincodes FROM organizations WHERE organization_id = $1', [orgId]);
        if (orgResult.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Organization not found' });
        }

        const pincodes = (orgResult.rows[0].pincodes || '').split(',').map(p => p.trim()).filter(p => p);

        if (pincodes.length === 0) {
            return res.json({ success: true, requests: [], message: 'No pincodes assigned to this franchise' });
        }

        // For now, return pending shipments from those pincodes that haven't been assigned to org yet
        // This simulates customer booking requests awaiting pickup
        const placeholders = pincodes.map((_, i) => `$${i + 1}`).join(', ');
        const result = await db.query(`
            SELECT * FROM shipments 
            WHERE sender_pincode IN (${placeholders}) 
            AND status = 'pending'
            AND (organization_id IS NULL OR organization_id = $${pincodes.length + 1})
            ORDER BY created_at DESC
        `, [...pincodes, orgId]);

        const requests = result.rows.map(row => ({
            id: row.tracking_id || row.shipment_id,
            customer_name: row.sender_name,
            customer_phone: row.sender_phone,
            pickup_address: row.sender_address,
            pincode: row.sender_pincode,
            weight: row.weight || 0,
            status: row.status || 'pending',
            created_at: row.created_at
        }));

        res.json({ success: true, requests });
    } catch (err) {
        console.error("Franchisee Pickup Requests Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch pickup requests' });
    }
});

// Approve Pickup Request
router.post('/franchisee/pickup-requests/approve', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const { id, remarks } = req.body;
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        // Update shipment to assign to this franchise and mark as picked up
        const result = await db.query(`
            UPDATE shipments 
            SET organization_id = $1, status = 'picked up', updated_at = NOW()
            WHERE (tracking_id = $2 OR shipment_id::text = $2)
            RETURNING tracking_id
        `, [orgId, id]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Request not found' });
        }

        res.json({ success: true, message: 'Pickup approved', tracking_id: result.rows[0].tracking_id });
    } catch (err) {
        console.error("Approve Pickup Error:", err);
        res.status(500).json({ success: false, error: 'Failed to approve pickup' });
    }
});

// Reject Pickup Request
router.post('/franchisee/pickup-requests/reject', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const { id, remarks } = req.body;
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        // Update shipment status to rejected/cancelled
        const result = await db.query(`
            UPDATE shipments 
            SET status = 'cancelled', updated_at = NOW()
            WHERE (tracking_id = $1 OR shipment_id::text = $1)
            AND (organization_id IS NULL OR organization_id = $2)
            RETURNING tracking_id
        `, [id, orgId]);

        if (result.rowCount === 0) {
            return res.status(404).json({ success: false, error: 'Request not found or permission denied' });
        }

        res.json({ success: true, message: 'Pickup request rejected' });
    } catch (err) {
        console.error("Reject Pickup Error:", err);
        res.status(500).json({ success: false, error: 'Failed to reject pickup' });
    }
});

// ═══════════════════════════════════════════════════════════
//  FRANCHISEE - STAFF MANAGEMENT
// ═══════════════════════════════════════════════════════════

// Create Staff for Franchisee
router.post('/franchisee/staff/create', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        const { full_name, phone, username, password, staff_role } = req.body;

        // Validation
        if (!full_name || !username || !password) {
            return res.status(400).json({ success: false, error: 'Name, username and password are required' });
        }

        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
        if (cleanPhone && cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 12);

        // Insert staff
        const result = await db.query(`
            INSERT INTO users (username, password_hash, full_name, phone, role, organization_id, staff_role, staff_status, created_at)
            VALUES ($1, $2, $3, $4, 'staff', $5, $6, 'Active', NOW())
            RETURNING user_id
        `, [username, hashedPassword, full_name, cleanPhone, orgId, staff_role || 'Staff']);

        res.json({ success: true, message: 'Staff created successfully', user_id: result.rows[0].user_id });
    } catch (err) {
        console.error("Franchisee Create Staff Error:", err);
        res.status(500).json({ success: false, error: 'Failed to create staff' });
    }
});

// Update Staff for Franchisee
router.post('/franchisee/staff/update', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        const { user_id, full_name, phone, staff_role, password } = req.body;

        if (!user_id) {
            return res.status(400).json({ success: false, error: 'User ID is required' });
        }

        // Verify staff belongs to this franchise
        const verify = await db.query('SELECT organization_id FROM users WHERE user_id = $1', [user_id]);
        if (verify.rows.length === 0 || verify.rows[0].organization_id != orgId) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
        if (cleanPhone && cleanPhone.length !== 10) {
            return res.status(400).json({ success: false, error: 'Phone number must be exactly 10 digits' });
        }

        // Build update query
        let updateQuery = 'UPDATE users SET full_name = $1, phone = $2, staff_role = $3';
        let params = [full_name, cleanPhone, staff_role];

        // If password provided, hash and update
        if (password && password.length >= 6) {
            const hashedPassword = await bcrypt.hash(password, 10);
            updateQuery += ', password_hash = $4 WHERE user_id = $5';
            params.push(hashedPassword, user_id);
        } else {
            updateQuery += ' WHERE user_id = $4';
            params.push(user_id);
        }

        await db.query(updateQuery, params);
        res.json({ success: true, message: 'Staff updated successfully' });
    } catch (err) {
        console.error("Franchisee Update Staff Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update staff' });
    }
});

// Toggle Staff Status for Franchisee
router.post('/franchisee/staff/status', validateSession, requireRole('franchisee'), async (req, res) => {
    try {
        const orgId = req.organization?.id;
        if (!orgId) return res.status(403).json({ success: false, error: 'No organization linked' });

        const { user_id, status } = req.body;

        if (!user_id || !status) {
            return res.status(400).json({ success: false, error: 'User ID and status are required' });
        }

        // Verify staff belongs to this franchise
        const verify = await db.query('SELECT organization_id FROM users WHERE user_id = $1', [user_id]);
        if (verify.rows.length === 0 || verify.rows[0].organization_id != orgId) {
            return res.status(403).json({ success: false, error: 'Permission denied' });
        }

        await db.query('UPDATE users SET staff_status = $1 WHERE user_id = $2', [status, user_id]);
        res.json({ success: true, message: 'Staff status updated' });
    } catch (err) {
        console.error("Franchisee Staff Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

// ═══════════════════════════════════════════════════════════
//  STAFF DASHBOARD OPERATIONS
// ═══════════════════════════════════════════════════════════

// Get Staff Stats
router.get('/staff/stats', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const orgId = req.organization?.id;

        // If staff is not linked to an org, return empty stats
        if (!orgId) {
            return res.json({
                success: true,
                stats: {
                    pendingAtHub: 0,
                    outForDelivery: 0,
                    deliveredToday: 0
                }
            });
        }

        const pendingAtHubRes = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1 AND status IN ('pending', 'in_transit', 'picked_up')", [orgId]);
        const outForDeliveryRes = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1 AND status = 'out_for_delivery'", [orgId]);

        // Delivered TODAY by this hub
        const deliveredTodayRes = await db.query("SELECT COUNT(*) FROM shipments WHERE organization_id = $1 AND status = 'delivered' AND updated_at >= CURRENT_DATE", [orgId]);

        res.json({
            success: true,
            stats: {
                pendingAtHub: parseInt(pendingAtHubRes.rows[0].count),
                outForDelivery: parseInt(outForDeliveryRes.rows[0].count),
                deliveredToday: parseInt(deliveredTodayRes.rows[0].count)
            }
        });
    } catch (err) {
        console.error("Staff Stats Error:", err);
        res.status(500).json({ success: false, error: 'Failed to fetch stats' });
    }
});



// Search Shipment by Tracking ID (For Scanning)
router.get('/staff/search/:id', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const { id } = req.params;
        const result = await db.query(`
            SELECT * FROM shipments WHERE tracking_id = $1
        `, [id]);

        if (result.rows.length === 0) {
            return res.status(404).json({ success: false, error: 'Shipment not found' });
        }

        const s = result.rows[0];
        const shipment = {
            id: s.tracking_id,
            tracking_id: s.tracking_id,
            sender: s.sender_name,
            receiver: s.receiver_name,
            origin: s.origin_address,
            destination: s.destination_address,
            status: s.status,
            weight: s.weight,
            price: s.price,
            created_at: s.created_at
        };

        res.json({ success: true, shipment });
    } catch (err) {
        console.error("Staff Search Error:", err);
        res.status(500).json({ success: false, error: 'Search failed' });
    }
});

// Update Status (Staff)
router.post('/staff/shipments/update-status', validateSession, requireRole('staff'), async (req, res) => {
    try {
        const { tracking_id, status } = req.body;

        if (!tracking_id || !status) {
            return res.status(400).json({ success: false, error: 'Tracking ID and Status required' });
        }

        await db.query(`
            UPDATE shipments 
            SET status = $1, updated_at = NOW() 
            WHERE tracking_id = $2
        `, [status.toLowerCase().replace(' ', '_'), tracking_id]);

        res.json({ success: true, message: 'Status updated successfully' });
    } catch (err) {
        console.error("Staff Update Status Error:", err);
        res.status(500).json({ success: false, error: 'Failed to update status' });
    }
});

module.exports = router;


