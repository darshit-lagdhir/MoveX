const jwt = require('jsonwebtoken');
const sessionStore = require('./session');

const COOKIE_NAME = 'movex.sid';
const isProd = process.env.NODE_ENV === 'production';

// Production: secure cookies with SameSite=None for cross-origin
// Development: relaxed settings for localhost
const sameSite = isProd ? 'none' : 'lax';
const secureCookie = isProd;

function setSessionCookie(res, sessionId) {
  res.cookie(COOKIE_NAME, sessionId, {
    httpOnly: true,
    sameSite: sameSite,
    secure: secureCookie,
    path: '/',
    maxAge: 1000 * 60 * 60 * 1 // 1 hour
  });
}

function clearSessionCookie(res) {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    sameSite: sameSite,
    secure: secureCookie,
    path: '/'
  });
}

async function requireSession(req, res, next) {
  const db = require('./config/db'); // Lazy load to avoid circular deps
  let session = null;

  // 1. Try Cookie Strategy
  const sid = req.cookies?.[COOKIE_NAME];
  if (sid) {
    session = await sessionStore.getSession(sid);
  }

  // 2. Try JWT Header Strategy (Fallback for Cross-Domain/Cloudflare)
  if (!session) {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      try {
        if (!process.env.JWT_SECRET) {
          console.error('JWT_SECRET missing in env');
        }
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        // Hydrate session from Token
        session = {
          username: decoded.username,
          role: decoded.role,
        };
      } catch (err) {
        console.warn('Backend: Bearer token invalid', err.message);
      }
    }
  }

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.session = session;

  // 3. Load user data (userId and organization) for all roles
  try {
    const userResult = await db.query(
      'SELECT user_id, organization_id FROM users WHERE username = $1',
      [session.username]
    );
    if (userResult.rows.length > 0) {
      // CRITICAL: Store userId in session for staff queries
      req.session.userId = userResult.rows[0].user_id;

      // Load organization data for franchisees/staff
      if ((session.role === 'franchisee' || session.role === 'staff') && userResult.rows[0].organization_id) {
        const orgResult = await db.query(
          'SELECT organization_id, name, pincodes, full_address, status FROM organizations WHERE organization_id = $1',
          [userResult.rows[0].organization_id]
        );
        if (orgResult.rows.length > 0) {
          req.organization = {
            id: orgResult.rows[0].organization_id,
            ...orgResult.rows[0]
          };
        }
      }
    }
  } catch (err) {
    console.warn('Failed to load user/organization data:', err.message);
  }

  next();
}

function whoami(req, res) {
  return res.json({
    user: {
      id: req.session.userId,
      username: req.session.username,
      role: req.session.role
    }
  });
}

function requireRole(role) {
  return (req, res, next) => {
    if (!req.session || req.session.role !== role) {
      return res.status(403).json({ error: 'Forbidden' });
    }
    next();
  }
}

module.exports = {
  setSessionCookie,
  clearSessionCookie,
  requireSession,
  validateSession: requireSession,
  whoami,
  requireRole
};


