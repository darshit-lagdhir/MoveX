const bcrypt = require('bcrypt');
const pool = require('../config/db');

const MIN_PASSWORD_LENGTH = 8;

// Removed live username check for simplification

// ═══════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════
exports.register = async (req, res) => {
  try {
    const { username, password, full_name, phone } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    // SECURITY: Password hashing with bcrypt (cost factor 10)
    const hash = await bcrypt.hash(password, 10);

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;

    await pool.query(
      `INSERT INTO users (username, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'user', 'active', $3, $4)`,
      [normalizedUsername, hash, full_name, cleanPhone]
    );

    return res.status(201).json({ message: 'Registration successful. Please log in.' });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(400).json({ message: 'Registration failed. Please try again.' });
  }
};

// ═══════════════════════════════════════════════════════════
// LOGIN (No JWT, No Sessions - Just bcrypt hash verification)
// ═══════════════════════════════════════════════════════════
exports.login = async (req, res) => {
  try {
    const { username, password, role } = req.body || {};

    if (!username || !password) {
      return res.status(400).json({ message: 'Login failed. Please check your input.' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const { rows } = await pool.query(
      'SELECT user_id, username, password_hash, role, status FROM users WHERE username = $1',
      [normalizedUsername]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // Role check (if frontend sends a role, match it)
    if (role && user.role !== role) {
      return res.status(401).json({ message: 'Invalid role for this user.' });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ message: 'Account has been disabled by Admin.' });
    }

    // SECURITY: bcrypt password comparison
    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.user_id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

// ═══════════════════════════════════════════════════════════
// LOGOUT (Simple - no server-side state to destroy)
// ═══════════════════════════════════════════════════════════
exports.logout = async (req, res) => {
  return res.status(200).json({ message: 'Logged out successfully.' });
};

// Removed password reset flow for simplification

// ═══════════════════════════════════════════════════════════
// CHANGE PASSWORD (Authenticated via simple header check)
// ═══════════════════════════════════════════════════════════
exports.changePassword = async (req, res) => {
  try {
    const { oldPassword, newPassword } = req.body;
    const username = req.user.username;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Missing password information' });
    }

    if (newPassword.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ success: false, error: `New password must be at least ${MIN_PASSWORD_LENGTH} characters.` });
    }

    const { rows } = await pool.query('SELECT password_hash FROM users WHERE username = $1', [username]);
    if (rows.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    const match = await bcrypt.compare(oldPassword, rows[0].password_hash);
    if (!match) {
      return res.status(400).json({ success: false, error: 'Current password is incorrect.' });
    }

    const hash = await bcrypt.hash(newPassword, 10);
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
};
