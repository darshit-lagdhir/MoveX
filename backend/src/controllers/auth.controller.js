const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const sessionStore = require('../session');
const { setSessionCookie, clearSessionCookie } = require('../sessionMiddleware');

const MIN_PASSWORD_LENGTH = 8;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change-me';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';
const ALLOWED_LOGIN_FIELDS = ['username', 'password', 'role'];
const ALLOWED_REGISTER_FIELDS = ['username', 'password', 'securityAnswers'];
const ALLOWED_FORGOT_FIELDS = ['email', 'username']; // accept username (mapped to email column)
const ALLOWED_VERIFY_FIELDS = ['username', 'securityAnswers'];
const ALLOWED_RESET_FIELDS = ['token', 'password'];
const RESET_TOKEN_TTL_MINUTES = 15;

exports.register = async (req, res) => {
  try {
    const body = req.body || {};
    const unknownRegisterField = Object.keys(body).find(
      (key) => !ALLOWED_REGISTER_FIELDS.includes(key)
    );
    if (unknownRegisterField) {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const { username, password } = body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (username.length < 3 || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE email = $1',
      [normalizedUsername]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const hash = await bcrypt.hash(password, 10);

    const defaultRole = 'user';
    const status = 'active';

    await pool.query(
      `INSERT INTO users (email, password_hash, role, status, security_answers)
       VALUES ($1, $2, $3, $4, $5)`,
      [normalizedUsername, hash, defaultRole, status, JSON.stringify(body.securityAnswers || {})]
    );

    return res.status(201).json({
      message: 'Registration successful. Please log in.'
    });
  } catch (err) {
    console.error('Registration error:', err);
    return res.status(400).json({
      message: 'Registration failed. Please try again.'
    });
  }
};

exports.login = async (req, res) => {
  try {
    if (!req.is('application/json')) {
      return res.status(400).json({ message: 'Login failed. Please check your input.' });
    }

    const body = req.body || {};
    const unknownLoginField = Object.keys(body).find(
      (key) => !ALLOWED_LOGIN_FIELDS.includes(key)
    );
    if (unknownLoginField) {
      return res.status(400).json({ message: 'Login failed. Please check your input.' });
    }

    const { username, password } = body;
    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Login failed. Please check your input.' });
    }

    const normalizedUsername = username.trim().toLowerCase();
    const { rows } = await pool.query(
      'SELECT id, email, password_hash, role, status FROM users WHERE email = $1',
      [normalizedUsername]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    /* Enforce Role Check if provided */
    if (body.role && body.role !== user.role) {
      return res.status(400).json({ message: 'Role mismatch. Please select the correct role.' });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // MoveX User Activity Tracking
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [user.id]);

    // Create server-side session and set HttpOnly cookie
    const session = sessionStore.createSession({
      id: user.id,
      email: user.email,
      role: user.role
    });
    setSessionCookie(res, session.id);

    return res.status(200).json({
      message: 'Login successful.',
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.logout = (req, res) => {
  const sid = req.cookies?.['movex.sid'];
  if (sid) {
    sessionStore.destroySession(sid);
  }
  clearSessionCookie(res);
  return res.status(200).json({ message: 'Logged out.' });
};

// Forgot password (generic response, anti-enumeration)
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

    // Get user and stored answers
    const { rows } = await pool.query(
      'SELECT id, role, security_answers FROM users WHERE email = $1',
      [normalizedUsername]
    );
    const user = rows[0];

    // Security: Don't reveal user doesn't exist, just error generally?
    // User requested: "forgot password will only work for ROLE - User & Customer"
    if (!user) {
      return res.status(400).json({ message: 'Verification failed.' });
    }

    if (user.role === 'admin' || user.role === 'franchisee' || user.role === 'staff') {
      return res.status(403).json({ message: 'Contact Administrator to reset password.' });
    }

    const stored = user.security_answers || {};

    // Simple string comparison (case-insensitive trim) for MVP as requested. 
    // Ideally these should be hashed.
    const valid =
      (stored.q1 || '').trim().toLowerCase() === q1.trim().toLowerCase() &&
      (stored.q2 || '').trim().toLowerCase() === q2.trim().toLowerCase() &&
      (stored.q3 || '').trim().toLowerCase() === q3.trim().toLowerCase();

    if (!valid) {
      return res.status(400).json({ message: 'Incorrect answers.' });
    }

    // Generate Reset Token
    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

    // clear old tokens
    await pool.query('DELETE FROM password_resets WHERE user_id = $1', [user.id]);

    await pool.query(
      `INSERT INTO password_resets (user_id, token_hash, expires_at, used)
       VALUES ($1, $2, $3, false)`,
      [user.id, tokenHash, expiresAt]
    );

    return res.status(200).json({
      message: 'Verified.',
      resetToken: token
    });

  } catch (err) {
    console.error('Verify questions error:', err);
    return res.status(500).json({ message: 'Verification failed.' });
  }
};

// Forgot password (generic response, anti-enumeration) - KEPT FOR COMPATIBILITY OR ADMIN IF NEEDED
// BUT USER SAID REMOVE LINK SYSTEM. SO THIS IS LIKELY UNUSED BY FRONTEND NOW.
exports.forgotPassword = async (req, res) => {
  // Legacy / Admin support if needed, otherwise deprecated by new flow
  return res.status(404).json({ message: 'Use security question verification.' });
};



exports.checkRecoveryEligibility = async (req, res) => {
  try {
    const { username } = req.body || {};
    if (!username) {
      return res.status(400).json({ message: 'Username is required.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    const { rows } = await pool.query(
      'SELECT id, role FROM users WHERE email = $1',
      [normalizedUsername]
    );
    const user = rows[0];

    if (!user) {
      // To prevent enumeration, we can say "Eligible" or error.
      // User asked for specific error check for ADMIN/STAFF/FRANCHISEE.
      // If user doesn't exist, we should probably just say "User not found" or handle it smoothly.
      // Let's return 404 for not found to keep it simple for now as per "check whether username belongs..."
      return res.status(404).json({ message: 'User not found.' });
    }

    if (['admin', 'staff', 'franchisee'].includes(user.role)) {
      return res.status(403).json({ message: 'Contact Administrator to reset password.' });
    }

    return res.status(200).json({ message: 'Eligible.' });
  } catch (err) {
    console.error('Check recovery eligibility error:', err);
    return res.status(500).json({ message: 'Server error.' });
  }
};

exports.resetPassword = async (req, res) => {
  try {
    if (!req.is('application/json')) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }
    const body = req.body || {};
    const unknown = Object.keys(body).find(k => !ALLOWED_RESET_FIELDS.includes(k));
    if (unknown) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }

    const { token, password } = body;
    if (!token || !password || typeof token !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }
    if (password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const { rows } = await pool.query(
      `SELECT pr.id, pr.user_id, pr.expires_at, pr.used, u.email
       FROM password_resets pr
       JOIN users u ON u.id = pr.user_id
       WHERE pr.token_hash = $1`,
      [tokenHash]
    );

    const reset = rows[0];
    if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }

    const hash = await bcrypt.hash(password, 10);

    await pool.query('BEGIN');
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, reset.user_id]);
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [reset.id]);
    await pool.query('COMMIT');

    // Invalidate all sessions for this user
    sessionStore.destroySessionsForUser(reset.user_id);

    return res.status(200).json({ message: 'Password has been reset. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    await pool.query('ROLLBACK').catch(() => { });
    return res.status(400).json({ message: 'Reset failed. Please try again.' });
  }
};
