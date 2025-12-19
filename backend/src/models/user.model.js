const pool = require('../config/db');

async function findUserByEmail(email) {
  const query = 'SELECT id, email, password_hash, role FROM users WHERE email = $1';
  const { rows } = await pool.query(query, [email]);
  return rows[0] || null;
}

module.exports = {
  findUserByEmail
};
