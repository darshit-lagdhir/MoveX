const pool = require('../config/db');

async function findUserByUsername(username) {
  const query = 'SELECT user_id, username, password_hash, role FROM users WHERE username = $1';
  const { rows } = await pool.query(query, [username]);
  return rows[0] || null;
}

module.exports = {
  findUserByUsername
};
