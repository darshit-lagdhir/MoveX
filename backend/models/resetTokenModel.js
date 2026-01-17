const db = require('../src/config/db');
const crypto = require('crypto');

module.exports = {
	// create a token record (tokenHash must be precomputed)
	async createToken(username, tokenHash, expiresAt) {
		// invalidate previous unused tokens for the user (single active token rule)
		await db.query(
			'UPDATE password_resets SET used = true WHERE username = $1 AND used = false',
			[username]
		);
		const res = await db.query(
			'INSERT INTO password_resets (username, token_hash, expires_at) VALUES ($1, $2, $3) RETURNING reset_id',
			[username, tokenHash, expiresAt]
		);
		return res.rows[0];
	},

	async findValidByHash(tokenHash) {
		const res = await db.query(
			'SELECT * FROM password_resets WHERE token_hash = $1 AND used = false AND expires_at > now() LIMIT 1',
			[tokenHash]
		);
		return res.rows[0] || null;
	},

	async markUsed(reset_id) {
		await db.query('UPDATE password_resets SET used = true WHERE reset_id = $1', [reset_id]);
	},
};
