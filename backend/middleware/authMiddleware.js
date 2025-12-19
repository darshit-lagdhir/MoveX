/**
 * ⚠️ DEPRECATED: Root middleware structure not used
 * 
 * Active middleware is in: src/routes/ and src/app.js
 * This folder is kept for reference only.
 * 
 * DO NOT use these files.
 */

const jwt = require('jsonwebtoken');
const db = require('../db');

const protect = async (req, res, next) => {
	try {
		const authHeader = req.headers.authorization;
		if (!authHeader) {
			return res.status(401).json({ message: 'Access denied. No token provided.' });
		}

		const token = authHeader.split(' ')[1];
		if (!token) {
			return res.status(401).json({ message: 'Access denied. No token provided.' });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);
		const userResult = await db.query('SELECT id, email, role, status FROM users WHERE id = $1', [decoded.userId]);

		if (userResult.rows.length === 0 || userResult.rows[0].status !== 'active') {
			return res.status(403).json({ message: 'Invalid session.' });
		}

		req.user = userResult.rows[0];
		next();
	} catch (err) {
		return res.status(403).json({ message: 'Invalid token.' });
	}
};

module.exports = { protect };
