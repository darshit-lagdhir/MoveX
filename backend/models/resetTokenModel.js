const db = require('../src/config/db');
const crypto = require('crypto');

module.exports = {
	// create a token record (tokenHash must be precomputed)
	async createToken(userId, tokenHash, expiresAt) {
		// invalidate previous unused tokens for the user (single active token rule)
		await db.query(
			'UPDATE password_reset_tokens SET used = true WHERE user_id = $1 AND used = false',
			[userId]
		);
		const res = await db.query(
			'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING id',
			[userId, tokenHash, expiresAt]
		);
		return res.rows[0];
	},

	async findValidByHash(tokenHash) {
		const res = await db.query(
			'SELECT * FROM password_reset_tokens WHERE token_hash = $1 AND used = false AND expires_at > now() LIMIT 1',
			[tokenHash]
		);
		return res.rows[0] || null;
	},

	async markUsed(id) {
		await db.query('UPDATE password_reset_tokens SET used = true WHERE id = $1', [id]);
	},
};
