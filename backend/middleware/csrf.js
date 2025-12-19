const crypto = require('crypto');

// In-memory token store (in production, use Redis or session store)
const _csrfTokens = new Map();
const TOKEN_EXPIRY_MS = 30 * 60 * 1000; // 30 minutes

function generateCsrfToken() {
	const token = crypto.randomBytes(32).toString('hex');
	_csrfTokens.set(token, Date.now() + TOKEN_EXPIRY_MS);
	return token;
}

function validateCsrfToken(token) {
	if (!token || typeof token !== 'string') return false;
	const expiry = _csrfTokens.get(token);
	if (!expiry || expiry < Date.now()) {
		_csrfTokens.delete(token);
		return false;
	}
	_csrfTokens.delete(token); // single-use
	return true;
}

// Middleware: check CSRF token on state-changing requests
function csrfProtection(req, res, next) {
	if (process.env.CSRF_ENABLED !== 'true') return next();
	if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
	const token = req.headers['x-csrf-token'] || req.body?.csrfToken;
	if (!validateCsrfToken(token)) {
		console.warn(`[SECURITY] CSRF token validation failed from IP ${req.ip}`);
		return res.status(403).json({ message: 'Access denied.' });
	}
	next();
}

module.exports = { generateCsrfToken, validateCsrfToken, csrfProtection };
