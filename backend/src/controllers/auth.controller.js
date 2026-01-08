const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const pool = require('../config/db');
const sessionStore = require('../session');
const { setSessionCookie, clearSessionCookie } = require('../sessionMiddleware');

const MIN_PASSWORD_LENGTH = 8;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '2h';

// SECURITY: Validate JWT_SECRET is properly configured
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  console.error('❌ SECURITY ERROR: JWT_SECRET environment variable is not set!');
  console.error('   Using a default value is UNSAFE for production.');
  process.exit(1);
}
if (JWT_SECRET.length < 32) {
  console.warn('⚠️ SECURITY WARNING: JWT_SECRET is shorter than recommended (32+ characters).');
}
const ALLOWED_LOGIN_FIELDS = ['username', 'password', 'role'];
const ALLOWED_REGISTER_FIELDS = ['username', 'password', 'securityAnswers', 'full_name', 'phone', 'role'];
const ALLOWED_RESET_FIELDS = ['token', 'password'];
const RESET_TOKEN_TTL_MINUTES = 15;

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

exports.register = async (req, res) => {
  try {
    const body = req.body || {};
    const unknownRegisterField = Object.keys(body).find(
      (key) => !ALLOWED_REGISTER_FIELDS.includes(key)
    );
    if (unknownRegisterField) {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const { username, password, full_name, phone, role } = body;

    if (!username || !password || typeof username !== 'string' || typeof password !== 'string') {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const normalizedUsername = username.trim().toLowerCase();

    if (username.length < 3 || password.length < MIN_PASSWORD_LENGTH) {
      return res.status(400).json({ message: 'Registration failed. Please check your input.' });
    }

    const existing = await pool.query(
      'SELECT id FROM users WHERE username = $1',
      [normalizedUsername]
    );
    if (existing.rows.length > 0) {
      return res.status(400).json({ message: 'Username is already taken.' });
    }

    // SECURITY: Use bcrypt cost factor 12 (industry standard)
    const hash = await bcrypt.hash(password, 12);

    // Only allow user role for self-registration (admin/franchisee/staff must be created by admin)
    const allowedSelfRegisterRoles = ['user'];
    const userRole = (role && allowedSelfRegisterRoles.includes(role.toLowerCase())) ? role.toLowerCase() : 'user';
    const status = 'active';

    await pool.query(
      `INSERT INTO users (username, password_hash, role, status, security_answers, full_name, phone)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [normalizedUsername, hash, userRole, status, JSON.stringify(body.securityAnswers || {}), full_name, phone]
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
      'SELECT id, username, password_hash, role, status FROM users WHERE username = $1',
      [normalizedUsername]
    );

    const user = rows[0];
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    const { role } = body;

    // Validate role if provided (Strict Mode for User Request)
    if (role && user.role !== role) {
      return res.status(401).json({ message: 'Invalid role for this user.' });
    }

    if (user.status && user.status !== 'active') {
      return res.status(403).json({ message: 'Account is not active.' });
    }

    const passwordMatch = await bcrypt.compare(password, user.password_hash);
    if (!passwordMatch) {
      return res.status(400).json({ message: 'Invalid credentials.' });
    }

    // MoveX User Activity Tracking
    await pool.query('UPDATE users SET last_login_at = NOW() WHERE username = $1', [user.username]);

    // Create server-side session and set HttpOnly cookie
    const session = await sessionStore.createSession({
      username: user.username,
      role: user.role
    });
    setSessionCookie(res, session.token);

    // Generate JWT for cross-origin fallback (when cookies blocked)
    // Include sessionToken so logout can work even without cookies
    const token = jwt.sign(
      { username: user.username, role: user.role, sessionToken: session.token },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    return res.status(200).json({
      message: 'Login successful.',
      token, // For cross-origin auth
      user: {
        id: user.id,
        username: user.username,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ message: 'Login failed. Please try again.' });
  }
};

exports.logout = async (req, res) => {
  try {
    const sid = req.cookies?.['movex.sid'];
    if (sid) {
      await sessionStore.destroySession(sid);
    } else {
      // Fallback for production: destroy all sessions for user if Bearer token present
      const authHeader = req.headers.authorization;
      if (authHeader && authHeader.startsWith('Bearer ')) {
        const token = authHeader.substring(7);
        try {
          const decoded = jwt.verify(token, process.env.JWT_SECRET);
          const username = decoded.username || decoded.userId || decoded.id;
          if (username) {
            await sessionStore.destroySessionsForUser(username);
          }
        } catch (e) {
          // Ignore token errors on logout
        }
      }
    }
  } catch (err) {
    console.error('Logout cleanup error:', err);
  }
  clearSessionCookie(res);
  return res.status(200).json({ message: 'Logged out successfully.' });
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
      'SELECT id, role, security_answers FROM users WHERE username = $1',
      [normalizedUsername]
    );
    const user = rows[0];

    // Security: Don't reveal user doesn't exist, just error generally?
    // User requested: "forgot password will only work for ROLE - User"
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
    await pool.query('DELETE FROM password_resets WHERE username = $1', [user.username]);

    await pool.query(
      `INSERT INTO password_resets (username, token_hash, expires_at, used)
       VALUES ($1, $2, $3, false)`,
      [user.username, tokenHash, expiresAt]
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
    if (!username) return res.status(400).json({ message: 'Username is required.' });

    const normalized = username.trim().toLowerCase();
    const { rows } = await pool.query('SELECT id, role FROM users WHERE username = $1', [normalized]);

    if (rows.length === 0) {
      // Security: Fake success to prevent username enumeration
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
      `SELECT pr.id, pr.username, pr.expires_at, pr.used
       FROM password_resets pr
       WHERE pr.token_hash = $1`,
      [tokenHash]
    );

    const reset = rows[0];
    if (!reset || reset.used || new Date(reset.expires_at) < new Date()) {
      return res.status(400).json({ message: 'Reset failed. Please try again.' });
    }

    // SECURITY: Use bcrypt cost factor 12
    const hash = await bcrypt.hash(password, 12);

    await pool.query('BEGIN');
    await pool.query('UPDATE users SET password_hash = $1 WHERE username = $2', [hash, reset.username]);
    await pool.query('UPDATE password_resets SET used = true WHERE id = $1', [reset.id]);
    await pool.query('COMMIT');

    // Invalidate all sessions for this user
    await sessionStore.destroySessionsForUser(reset.username);

    return res.status(200).json({ message: 'Password has been reset. Please log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    await pool.query('ROLLBACK').catch(() => { });
    return res.status(400).json({ message: 'Reset failed. Please try again.' });
  }
};
