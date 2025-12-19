const crypto = require('crypto');
const bcrypt = require('bcrypt');
const db = require('../db');
const resetTokenModel = require('../models/resetTokenModel');
const { sendPasswordResetEmail } = require('../utils/email');

const RESET_TOKEN_EXPIRY_MINUTES = Number(process.env.RESET_TOKEN_EXPIRY_MINUTES || 15);
const FRONTEND_RESET_URL = process.env.FRONTEND_RESET_URL;

function hashToken(token) {
	return crypto.createHash('sha256').update(token).digest('hex');
}

function generateToken() {
	return crypto.randomBytes(48).toString('hex'); // 96 hex chars ~ 384 bits
}

function isStrongPassword(pw) {
	// minimal strong rules: length >= 12, contains letter and number (adjust as needed)
	return typeof pw === 'string' && pw.length >= 12 && /[A-Za-z]/.test(pw) && /\d/.test(pw);
}

module.exports = {
	// POST /forgot-password
	async forgotPassword(req, res) {
		try {
			const { email } = req.body || {};
			// generic 200 response path
			const genericResponse = { message: 'If the account exists, you will receive a reset link.' };

			if (!email) return res.status(200).json(genericResponse);

			// find user by email (do not reveal existence)
			const u = await db.query('SELECT id, email FROM users WHERE email = $1 LIMIT 1', [email]);
			if (!u.rows || u.rows.length === 0) {
				// still respond generic
				return res.status(200).json(genericResponse);
			}
			const user = u.rows[0];

			// generate token, hash and store
			const token = generateToken();
			const tokenHash = hashToken(token);
			const expiresAt = new Date(Date.now() + RESET_TOKEN_EXPIRY_MINUTES * 60 * 1000);

			await resetTokenModel.createToken(user.id, tokenHash, expiresAt);

			// build reset link (plaintext token only in email)
			const resetLink = `${FRONTEND_RESET_URL}?token=${encodeURIComponent(token)}`;

			// send email (best-effort; failures should not reveal anything)
			try {
				await sendPasswordResetEmail(user.email, resetLink);
			} catch (err) {
				// log but do not reveal to client
				console.error('sendPasswordResetEmail error', { err: err && err.message, userId: user.id });
			}

			return res.status(200).json(genericResponse);
		} catch (err) {
			console.error('forgotPassword error', err && err.message);
			// always generic
			return res.status(200).json({ message: 'If the account exists, you will receive a reset link.' });
		}
	},

	// POST /reset-password
	async resetPassword(req, res) {
		try {
			const { token, newPassword } = req.body || {};
			if (!token || !newPassword) {
				return res.status(400).json({ message: 'Invalid request' });
			}

			if (!isStrongPassword(newPassword)) {
				return res.status(400).json({ message: 'Password does not meet requirements' });
			}

			const tokenHash = hashToken(token);
			const tokenRecord = await resetTokenModel.findValidByHash(tokenHash);
			if (!tokenRecord) {
				// don't say token expired vs invalid
				return res.status(400).json({ message: 'Invalid or expired token' });
			}

			// all validations passed -> update password atomically
			const client = await db.pool.connect();
			try {
				await client.query('BEGIN');

				// hash password
				const passwordHash = await bcrypt.hash(newPassword, 12);

				await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [
					passwordHash,
					tokenRecord.user_id,
				]);

				// mark token used
				await client.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [tokenRecord.id]);

				// best-effort session invalidation:
				// - try to delete refresh tokens if such a table exists
				try {
					await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [tokenRecord.user_id]);
				} catch (e) {
					// ignore if table doesn't exist; production should implement session invalidation appropriate to the app
				}

				// commit
				await client.query('COMMIT');
			} catch (e) {
				await client.query('ROLLBACK');
				throw e;
			} finally {
				client.release();
			}

			return res.status(200).json({ message: 'Password has been reset' });
		} catch (err) {
			console.error('resetPassword error', err && err.message);
			return res.status(400).json({ message: 'Invalid or expired token' });
		}
	},
};
