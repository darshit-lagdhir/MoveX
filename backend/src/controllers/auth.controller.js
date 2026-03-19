const bcrypt = require('bcrypt');
const pool = require('../config/db');

const MIN_PASSWORD_LENGTH = 8;

// ═══════════════════════════════════════════════════════════
// CHECK USERNAME AVAILABILITY
// ═══════════════════════════════════════════════════════════
exports.checkUsername = async (req, res) => {
  try {
    const { username } = req.params;
    if (!username || username.length < 3) {
      return res.json({ available: false, message: 'Invalid username' });
    }

    const normalized = username.trim().toLowerCase();
    const { rows } = await pool.query('SELECT username FROM users WHERE username = $1', [normalized]);

    return res.json({
      available: rows.length === 0,
      message: rows.length === 0 ? 'Username is available' : 'Username is already taken'
    });
  } catch (err) {
    console.error('Check username error:', err);
    return res.status(500).json({ available: false, error: 'Database error' });
  }
};

// ═══════════════════════════════════════════════════════════
// REGISTER
// ═══════════════════════════════════════════════════════════
exports.register = async (req, res) => {
  try {
    const { username, password, full_name, phone, securityAnswers } = req.body || {};

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (username.length < 3 || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const existing = await pool.query('SELECT user_id FROM users WHERE username = $1', [normalizedUsername]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // SECURITY: Password hashing with bcrypt (cost factor 12)
    const hash = await bcrypt.hash(password, 12);

    const cleanPhone = phone ? phone.replace(/[^0-9]/g, '') : null;
    if (cleanPhone && cleanPhone.length !== 10) {
      return res.status(400).json({ message: 'Phone number must be exactly 10 digits.' });
    }

    await pool.query(
      `INSERT INTO users (username, password_hash, role, status, security_answers, full_name, phone)
       VALUES ($1, $2, 'user', 'active', $3, $4, $5)`,
      [normalizedUsername, hash, JSON.stringify(securityAnswers || {}), full_name, cleanPhone]
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

    // Update last login
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE username = $1', [user.username]);

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

// ═══════════════════════════════════════════════════════════
// FORGOT PASSWORD - Security Questions Flow
// ═══════════════════════════════════════════════════════════
exports.forgotPassword = async (req, res) => {
  return res.status(404).json({ message: 'Use security question verification.' });
};

exports.checkRecoveryEligibility = async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) return res.status(400).json({ message: 'Username is required.' });

    const normalized = username.trim().toLowerCase();
    const { rows } = await pool.query('SELECT user_id, role FROM users WHERE username = $1', [normalized]);

    if (rows.length === 0) {
      return res.status(200).json({ message: 'Eligible.' });
    }

    const user = rows[0];
    if (['admin', 'staff', 'franchisee'].includes(user.role)) {
      return res.status(403).json({ message: 'Contact Administrator.' });
    }

    return res.status(200).json({ message: 'Eligible.' });
  } catch (err) {
    return res.status(500).json({ message: 'Server error.' });
  }
};

exports.verifyQuestions = async (req, res) => {
  try {
    const { username, securityAnswers } = req.body || {};
    if (!username || !securityAnswers) {
      return res.status(400).json({ message: 'Missing information.' });
    }

    const { q1, q2, q3 } = securityAnswers;
    if (!q1 || !q2 || !q3) {
      return res.status(400).json({ message: 'Please answer all questions.' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const { rows } = await pool.query(
      'SELECT user_id, role, security_answers FROM users WHERE username = $1',
      [normalizedUsername]
    );
    const user = rows[0];

    if (!user) {
      return res.status(400).json({ message: 'Verification failed.' });
    }

    if (user.role === 'admin' || user.role === 'franchisee' || user.role === 'staff') {
      return res.status(403).json({ message: 'Contact Administrator to reset password.' });
    }

    const stored = user.security_answers || {};

    const valid =
      (stored.q1 || '').trim().toLowerCase() === q1.trim().toLowerCase() &&
      (stored.q2 || '').trim().toLowerCase() === q2.trim().toLowerCase() &&
      (stored.q3 || '').trim().toLowerCase() === q3.trim().toLowerCase();

    if (!valid) {
      return res.status(400).json({ message: 'Incorrect answers.' });
    }

    // Generate a simple reset token (stored temporarily)
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000);

    await pool.query('DELETE FROM password_resets WHERE username = $1', [user.username]);
    await pool.query(
      `INSERT INTO password_resets (username, token_hash, expires_at, used) VALUES ($1, $2, $3, false)`,
      [user.username, tokenHash, expiresAt]
    );

    return res.status(200).json({ message: 'Verified.', resetToken: token });
  } catch (err) {
    console.error('Verify questions error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    const { token, password } = req.body || {};
    if (!token || !password) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }

    const crypto = require('crypto');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await pool.query(
      `SELECT pr.reset_id, pr.username, pr.expires_at, pr.used FROM password_resets pr WHERE pr.token_hash = $1`,
      [tokenHash]
    );

    const reset = rows[0];
    if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }

    const hash = await bcrypt.hash(password, 12);

    await pool.query('BEGIN');
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, reset.username]);
    await pool.query('UPDATE password_resets SET used = true WHERE reset_id = $1', [reset.reset_id]);
    await pool.query('COMMIT');

    return res.status(200).json({ message: 'Password has been reset. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    await pool.query('ROLLBACK').catch(() => {});
    return res.status(400).json({ message: 'Reset failed. Please try again.' });
  }
};

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

    const hash = await bcrypt.hash(newPassword, 12);
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, username]);

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (err) {
    console.error('Change password error:', err);
    res.status(500).json({ success: false, error: 'Failed to update password.' });
  }
};
