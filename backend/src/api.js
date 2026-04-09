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
        const { username, password, role } = req.body;
        const { rows } = await db.query('SELECT * FROM users WHERE username = $1', [username.trim().toLowerCase()]);
        const user = rows[0];

        // 1. Existence and Status Audit (Check status before password to avoid leak/unnecessary processing)
        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }
        if (user.status !== 'active') {
            return res.status(403).json({ success: false, message: 'Account is currently suspended or inactive.' });
        }

        // 2. Credential Check
        if (!(await bcrypt.compare(password, user.password_hash))) {
            return res.status(400).json({ success: false, message: 'Invalid credentials.' });
        }

        // 3. Role Integrity Check (Security Hardening)
        if (role && user.role !== role) {
            return res.status(403).json({ success: false, message: `Access Denied: Account not registered as ${role}.` });
        }

        res.json({ success: true, user: { username: user.username, role: user.role } });
    } catch (err) { 
        res.status(500).json({ success: false, message: 'Login error.' }); 
    }
});

router.post('/auth/register', async (req, res) => {
    try {
        const { username, password, full_name, phone, security_answers } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await db.query(
            'INSERT INTO users (username, password_hash, role, status, full_name, phone, security_answers) VALUES ($1, $2, $3, $4, $5, $6, $7)',
            [username.trim().toLowerCase(), hash, 'user', 'active', full_name, phone, JSON.stringify(security_answers || {})]
        );
        res.json({ success: true });
    } catch (err) { res.status(400).json({ success: false, message: 'Registration failed.' }); }
});

router.post('/auth/forgot-password/check-user', async (req, res) => {
    try {
        const { username } = req.body;
        const normalizedUsername = username.trim().toLowerCase();
        const { rows } = await db.query('SELECT role, status FROM users WHERE username = $1', [normalizedUsername]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Username not found.' });
        }
        if (rows[0].role !== 'user') {
            return res.status(403).json({ success: false, message: 'Recovery is only for Customer accounts.' });
        }
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/auth/forgot-password/verify', async (req, res) => {
    try {
        const { username, answers } = req.body;
        const normalizedUsername = username.trim().toLowerCase();
        
        // 1. Precise Credential Audit
        const { rows } = await db.query('SELECT security_answers, role FROM users WHERE username = $1', [normalizedUsername]);
        
        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'No recovery records found for this username.' });
        }
        
        const user = rows[0];

        // 2. Role Restriction Enforcement
        if (user.role !== 'user') {
            return res.status(403).json({ success: false, message: 'Recovery portal is only accessible to standard Customer accounts.' });
        }

        const stored = user.security_answers || {};
        const q1Stored = (stored.q1 || stored.a1 || "").toString().toLowerCase().trim();
        const q2Stored = (stored.q2 || stored.a2 || "").toString().toLowerCase().trim();
        const q3Stored = (stored.q3 || stored.a3 || "").toString().toLowerCase().trim();

        const q1Input = (answers.q1 || answers.a1 || "").toString().toLowerCase().trim();
        const q2Input = (answers.q2 || answers.a2 || "").toString().toLowerCase().trim();
        const q3Input = (answers.q3 || answers.a3 || "").toString().toLowerCase().trim();

        // 3. Security Question Challenge Validation
        const isCorrect = (
            q1Stored === q1Input &&
            q2Stored === q2Input &&
            q3Stored === q3Input
        );

        if (!isCorrect) {
            return res.status(401).json({ success: false, message: 'Security verification failed. Answers do not match our records.' });
        }

        // Answers correct! Generate a reset token in the password_resets table
        const token = Math.random().toString(36).slice(-10).toUpperCase();
        const expires = new Date(Date.now() + 15 * 60000); // 15 mins

        await db.query(
            'INSERT INTO password_resets (username, token_hash, expires_at) VALUES ($1, $2, $3)',
            [normalizedUsername, token, expires]
        );

        res.json({ success: true, token });
    } catch (err) { 
        console.error('Verify error:', err);
        res.status(500).json({ success: false, message: 'System processing error during verification.' }); 
    }
});

router.post('/auth/forgot-password/reset', async (req, res) => {
    try {
        const { username, token, new_password } = req.body;
        
        // Validate token
        const { rows } = await db.query(
            'SELECT * FROM password_resets WHERE username = $1 AND token_hash = $2 AND used = false AND expires_at > NOW()',
            [username.trim().toLowerCase(), token]
        );

        if (rows.length === 0) return res.status(401).json({ success: false, message: 'Invalid or expired reset token.' });

        // Update password
        const hash = await bcrypt.hash(new_password, 10);
        await db.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username.trim().toLowerCase()]);
        
        // Mark token as used
        await db.query('UPDATE password_resets SET used = true WHERE reset_id = $1', [rows[0].reset_id]);

        res.json({ success: true, message: 'Password has been reset successfully.' });
    } catch (err) { res.status(500).json({ success: false, message: 'Reset failed.' }); }
});

/**
 * 📊 REAL-TIME STATS (ZERO HARDCODING)
 */
router.get('/stats', requireAuth, async (req, res) => {
    try {
        const { role, organization_id, username } = req.user;
        let stats = {};

        // ADMIN STATS
        if (role === 'admin') {
            const ship = await db.query("SELECT COUNT(*) as count FROM shipments");
            const rev = await db.query("SELECT SUM(price) as total FROM shipments WHERE status = 'delivered'");
            const usr = await db.query("SELECT COUNT(*) as count FROM users");
            const deliv = await db.query("SELECT COUNT(*) as count FROM shipments WHERE status = 'delivered'");
            const fran = await db.query("SELECT COUNT(*) as count FROM organizations");
            stats = {
                totalShipments: parseInt(ship.rows[0].count),
                totalUsers: parseInt(usr.rows[0].count),
                totalRevenue: parseFloat(rev.rows[0].total || 0),
                deliveredCount: parseInt(deliv.rows[0].count),
                totalFranchises: parseInt(fran.rows[0].count)
            };
        } else if (role === 'franchisee') {
            const ship = await db.query("SELECT COUNT(*) as count, SUM(price) as rev FROM shipments WHERE organization_id = $1", [organization_id]);
            const pend = await db.query("SELECT COUNT(*) as count FROM shipments WHERE organization_id = $1 AND status = 'booked'", [organization_id]);
            const monthly = await db.query(`
                SELECT SUM(price) as rev 
                FROM shipments 
                WHERE organization_id = $1 
                AND status = 'delivered' 
                AND created_at >= DATE_TRUNC('month', CURRENT_DATE)
            `, [organization_id]);
            
            stats = {
                totalShipments: parseInt(ship.rows[0].count),
                totalRevenue: parseFloat(ship.rows[0].rev || 0),
                monthlyRevenue: parseFloat(monthly.rows[0].rev || 0),
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
        let query = `
            SELECT s.*, u.full_name as staff_name 
            FROM shipments s
            LEFT JOIN users u ON s.assigned_staff_id = u.user_id 
        `;
        let params = [];

        if (role === 'admin') query += "ORDER BY created_at DESC LIMIT 50";
        else if (role === 'franchisee') { 
            // Franchisees see shipments assigned to them OR originating from their serviceable pincodes
            query += "WHERE s.organization_id = $1 OR s.sender_pincode = ANY(SELECT unnest(string_to_array(pincodes, ',')) FROM organizations WHERE organization_id = $1) ORDER BY s.created_at DESC"; 
            params = [organization_id]; 
        }
        else if (role === 'staff') { query += "WHERE s.assigned_staff_id = $1 ORDER BY s.created_at DESC"; params = [user_id]; }
        else { query += "WHERE s.creator_username = $1 ORDER BY s.created_at DESC"; params = [username]; }

        const { rows } = await db.query(query, params);
        res.json({ success: true, shipments: rows });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/shipments/create', requireAuth, async (req, res) => {
    try {
        const d = req.body;
        // Generate Tracking ID MX + random 6 digits
        const trk = 'MX' + Math.floor(100000 + Math.random() * 900000);
        let orgId = req.user.role === 'franchisee' ? req.user.organization_id : (d.organization_id || null);

        // Auto-assign hub based on sender pincode if not provided (for customer/admin bookings)
        if (!orgId && d.sender_pincode) {
            const orgSearch = await db.query("SELECT organization_id FROM organizations WHERE $1 = ANY(string_to_array(pincodes, ','))", [d.sender_pincode]);
            if (orgSearch.rows.length > 0) {
                orgId = orgSearch.rows[0].organization_id;
            }
        }

        await db.query(`
            INSERT INTO shipments (
                tracking_id, sender_name, sender_phone, sender_address, sender_pincode,
                receiver_name, receiver_phone, receiver_address, receiver_pincode,
                weight, price, status, organization_id, creator_username
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, 'booked', $12, $13)
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

router.post('/shipments/delete', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { tracking_id } = req.body;
        await db.query("DELETE FROM shipments WHERE tracking_id = $1", [tracking_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/shipments/assign', requireAuth, async (req, res) => {
    try {
        if (req.user.role !== 'admin' && req.user.role !== 'franchisee') {
            return res.status(403).json({ success: false, message: 'Forbidden: Only admins or hub operators can assign tasks.' });
        }

        const { tracking_id, staff_id } = req.body;
        
        // Verify the staff exists
        const staffRes = await db.query("SELECT * FROM users WHERE user_id = $1 AND role = 'staff'", [staff_id]);
        if (staffRes.rows.length === 0) return res.status(404).json({ success: false, message: 'Staff member not found.' });

        // Update shipment assignment
        await db.query(`
            UPDATE shipments 
            SET assigned_staff_id = $1, updated_at = NOW() 
            WHERE tracking_id = $2
        `, [staff_id, tracking_id]);

        res.json({ success: true });
    } catch (err) {
        console.error('Assignment error:', err);
        res.status(500).json({ success: false, message: err.message });
    }
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

router.post('/admin/users/update-status', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { user_id, status } = req.body;
        await db.query("UPDATE users SET status = $1 WHERE user_id = $2", [status, user_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/admin/users/delete', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { user_id } = req.body;

        // Get user info first
        const userRes = await db.query("SELECT * FROM users WHERE user_id = $1", [user_id]);
        if (userRes.rows.length === 0) return res.status(404).json({ success: false, message: 'User not found' });

        const user = userRes.rows[0];

        // 1. If Franchisee, we also delete the Hub organization asset
        if (user.role === 'franchisee' && user.organization_id) {
            await db.query("DELETE FROM organizations WHERE organization_id = $1", [user.organization_id]);
        }

        // 2. Delete the User account
        await db.query("DELETE FROM users WHERE user_id = $1", [user_id]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(500).json({ success: false, message: 'Deletion logic failed.' });
    }
});

router.get('/admin/franchises', requireAuth, requireRole('admin'), async (req, res) => {
    const { rows } = await db.query(`
        SELECT o.*, u.phone 
        FROM organizations o
        LEFT JOIN users u ON o.organization_id = u.organization_id AND u.role = 'franchisee'
        ORDER BY o.created_at DESC
    `);
    res.json({ success: true, franchises: rows });
});

router.post('/admin/franchises/create', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { name, pincodes, full_address, username, password, phone } = req.body;

        // 1. Create Organization
        const orgRes = await db.query(`
            INSERT INTO organizations (name, pincodes, full_address, type, status)
            VALUES ($1, $2, $3, 'franchise', 'active')
            RETURNING organization_id
        `, [name, pincodes, full_address]);

        const orgId = orgRes.rows[0].organization_id;

        // 2. Create Franchisee User
        const hash = await bcrypt.hash(password, 10);
        await db.query(`
            INSERT INTO users (username, password_hash, full_name, phone, role, status, organization_id)
            VALUES ($1, $2, $3, $4, 'franchisee', 'active', $5)
        `, [username.trim().toLowerCase(), hash, name, phone, orgId]);

        res.json({ success: true });
    } catch (err) {
        console.error(err);
        res.status(400).json({ success: false, message: err.message });
    }
});

router.post('/admin/franchises/delete', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { organization_id } = req.body;
        await db.query("DELETE FROM organizations WHERE organization_id = $1", [organization_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 🔐 USER SETTINGS & PROFILE
router.get('/user/profile', requireAuth, async (req, res) => {
    try {
        const { user_id } = req.user;
        const { rows } = await db.query("SELECT user_id, username, full_name, role, phone FROM users WHERE user_id = $1", [user_id]);
        res.json({ success: true, user: rows[0] });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/user/update-profile', requireAuth, async (req, res) => {
    try {
        const { user_id } = req.user;
        const { full_name, phone } = req.body;
        await db.query("UPDATE users SET full_name = $1, phone = $2 WHERE user_id = $3", [full_name, phone, user_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/user/change-password', requireAuth, async (req, res) => {
    try {
        const { user_id } = req.user;
        const { old_password, new_password } = req.body;

        const userRes = await db.query("SELECT password_hash FROM users WHERE user_id = $1", [user_id]);
        const match = await bcrypt.compare(old_password, userRes.rows[0].password_hash);
        if (!match) return res.status(400).json({ success: false, message: 'Current password incorrect' });

        const hash = await bcrypt.hash(new_password, 10);
        await db.query("UPDATE users SET password_hash = $1 WHERE user_id = $2", [hash, user_id]);
        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 🏗️ FRANCHISE SERVICEABILITY CHECK
router.get('/admin/franchises/check', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { pincode } = req.query;
        if (!pincode) return res.status(400).json({ success: false, message: 'Pincode required' });

        // Search for franchise whose pincodes column (comma separated) contains this pincode
        const { rows } = await db.query(`
            SELECT o.*, u.phone 
            FROM organizations o
            LEFT JOIN users u ON o.organization_id = u.organization_id AND u.role = 'franchisee'
            WHERE o.pincodes LIKE $1
        `, [`%${pincode}%`]);

        if (rows.length === 0) {
            return res.json({ success: false, message: 'No franchise hub covers this pincode.' });
        }

        res.json({ success: true, franchise: rows[0] });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.post('/admin/franchises/update', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const { organization_id, name, pincodes, full_address, phone } = req.body;
        
        // 1. Update Organization
        await db.query(`
            UPDATE organizations 
            SET name = $1, pincodes = $2, full_address = $3 
            WHERE organization_id = $4
        `, [name, pincodes, full_address, organization_id]);

        // 2. Update Franchisee User (Phone and Name)
        await db.query(`
            UPDATE users 
            SET phone = $1, full_name = $2 
            WHERE organization_id = $3 AND role = 'franchisee'
        `, [phone, name, organization_id]);

        res.json({ success: true });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 📊 FINANCE API
router.get('/admin/finances', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const rev = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'delivered' THEN price ELSE 0 END) as total_delivered, 
                SUM(CASE WHEN status NOT IN ('delivered', 'cancelled') THEN price ELSE 0 END) as pending 
            FROM shipments
        `);
        const trans = await db.query(`
            SELECT tracking_id as id, created_at as date, 'Shipment' as type, sender_name as entity, price as amount, status 
            FROM shipments 
            WHERE status = 'delivered'
            ORDER BY created_at DESC LIMIT 10
        `);
        res.json({
            success: true,
            totalRevenue: parseFloat(rev.rows[0].total_delivered || 0),
            pendingRevenue: parseFloat(rev.rows[0].pending || 0),
            transactions: trans.rows
        });
    } catch (err) { res.status(500).json({ success: false }); }
});

// 📈 REPORTS API
router.get('/admin/reports', requireAuth, requireRole('admin'), async (req, res) => {
    try {
        const total = await db.query("SELECT COUNT(*) as count FROM shipments");
        const deliv = await db.query("SELECT COUNT(*) as count FROM shipments WHERE status = 'delivered'");
        const daily = await db.query(`
            SELECT DATE(created_at) as date, COUNT(*) as total, 
            COUNT(CASE WHEN status = 'delivered' THEN 1 END) as completed,
            SUM(price) as revenue
            FROM shipments 
            GROUP BY DATE(created_at) 
            ORDER BY date DESC LIMIT 30
        `);
        res.json({
            success: true,
            totalShipments: parseInt(total.rows[0].count),
            deliveredCount: parseInt(deliv.rows[0].count),
            dailyReports: daily.rows
        });
    } catch (err) { res.status(500).json({ success: false }); }
});

router.get('/organization/staff', requireAuth, requireRole('franchisee'), async (req, res) => {
    const { rows } = await db.query("SELECT * FROM users WHERE organization_id = $1 AND role = 'staff'", [req.user.organization_id]);
    res.json({ success: true, staff: rows });
});

router.post('/organization/staff/create', requireAuth, requireRole('franchisee'), async (req, res) => {
    try {
        const { username, password, full_name, phone } = req.body;
        const hash = await bcrypt.hash(password, 10);
        await db.query(`
            INSERT INTO users (username, password_hash, full_name, phone, role, status, organization_id)
            VALUES ($1, $2, $3, $4, 'staff', 'active', $5)
        `, [username.trim().toLowerCase(), hash, full_name, phone, req.user.organization_id]);
        res.json({ success: true });
    } catch (err) { res.status(400).json({ success: false, message: err.message }); }
});

module.exports = router;
