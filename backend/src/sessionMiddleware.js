const sessionStore = require('./session');

const COOKIE_NAME = 'movex.sid';
const isProd = process.env.NODE_ENV === 'production';
const sameSite = process.env.SESSION_SAME_SITE || (isProd ? 'none' : 'lax');
const secureCookie = process.env.SESSION_SECURE === 'true' || isProd;

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
  const sid = req.cookies?.[COOKIE_NAME];
  const session = await sessionStore.getSession(sid);
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

module.exports = {
  setSessionCookie,
  clearSessionCookie,
  requireSession,
  whoami
};


