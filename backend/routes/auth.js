const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../db');
const { loginLimiter, registerLimiter, forgotPasswordLimiter } = require('../middleware/rateLimiter');
const { validateLoginPayload, validateRegisterPayload } = require('../middleware/validation');
const { logAuthAttempt } = require('../middleware/authLogging');
const { generateCsrfToken, csrfProtection } = require('../middleware/csrf');
const { protect } = require('../middleware/authMiddleware');

router.post('/login', loginLimiter, validateLoginPayload, csrfProtection, async (req, res) => {
	try {
		const { email, password } = req.body;
		const userResult = await db.query('SELECT * FROM users WHERE email = $1', [email]);
		
		if (userResult.rows.length === 0) {
			logAuthAttempt('login_failed', { email, reason: 'user_not_found', ip: req.ip });
			return res.status(401).json({ message: 'Invalid credentials.' });
		}

		const user = userResult.rows[0];
		if (user.status !== 'active') {
			logAuthAttempt('login_failed', { email, reason: 'inactive_account', ip: req.ip });
			return res.status(401).json({ message: 'Invalid credentials.' });
		}

		const isPasswordValid = await bcrypt.compare(password, user.password_hash);
		if (!isPasswordValid) {
			logAuthAttempt('login_failed', { email, reason: 'invalid_password', ip: req.ip });
			return res.status(401).json({ message: 'Invalid credentials.' });
		}

		const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
		logAuthAttempt('login_success', { email, userId: user.id, ip: req.ip });
		
		return res.json({ success: true, token, role: user.role });
	} catch (err) {
		console.error('[ERROR] login endpoint:', err.message);
		return res.status(500).json({ message: 'Request not allowed.' });
	}
});

router.post('/register', registerLimiter, validateRegisterPayload, csrfProtection, async (req, res) => {
	try {
		const { email, password, role } = req.body;
		const existingUser = await db.query('SELECT id FROM users WHERE email = $1', [email]);
		
		if (existingUser.rows.length > 0) {
			logAuthAttempt('register_failed', { email, reason: 'user_exists', ip: req.ip });
			return res.status(400).json({ message: 'Invalid request.' });
		}

		const passwordHash = await bcrypt.hash(password, 12);
		const newUserResult = await db.query(
			'INSERT INTO users (email, password_hash, role, status) VALUES ($1, $2, $3, $4) RETURNING id, email, role',
			[email, passwordHash, role, 'active']
		);
		
		const newUser = newUserResult.rows[0];
		const token = jwt.sign({ userId: newUser.id }, process.env.JWT_SECRET, { expiresIn: '1h' });
		logAuthAttempt('register_success', { email, userId: newUser.id, ip: req.ip });
		
		return res.status(201).json({ success: true, token, role: newUser.role });
	} catch (err) {
		console.error('[ERROR] register endpoint:', err.message);
		return res.status(500).json({ message: 'Request not allowed.' });
	}
});

router.post('/forgot-password', forgotPasswordLimiter, csrfProtection, async (req, res) => {
	try {
		const { email } = req.body || {};
		// ...existing code (send reset email if user exists)...
		logAuthAttempt('forgot_password_request', { email, ip: req.ip });
		return res.status(200).json({ message: 'If the account exists, you will receive a reset link.' });
	} catch (err) {
		console.error('[ERROR] forgot-password endpoint:', err.message);
		return res.status(200).json({ message: 'If the account exists, you will receive a reset link.' });
	}
});

router.get('/csrf-token', (req, res) => {
	// Frontend can call this to get a CSRF token before login/register
	const token = generateCsrfToken();
	res.json({ csrfToken: token });
});

router.get('/me', protect, (req, res) => {
	res.json({ success: true, user: req.user });
});

router.post('/logout', protect, (req, res) => {
	logAuthAttempt('logout', { userId: req.user.id, ip: req.ip });
	// Invalidate refresh tokens if they exist; clear HttpOnly cookie
	res.json({ success: true, message: 'Logged out.' });
});

module.exports = router;