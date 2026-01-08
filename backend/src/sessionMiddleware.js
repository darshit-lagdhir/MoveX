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
          // Map other standard session fields if needed
        };
      } catch (err) {
        // Token invalid or expired
        console.warn('Backend: Bearer token invalid', err.message);
      }
    }
  }

  if (!session) {
    return res.status(401).json({ message: 'Unauthorized' });
  }
  req.session = session;
  next();
}

function whoami(req, res) {
  return res.json({
    user: {
      id: req.session.userId,
      email: req.session.email,
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


