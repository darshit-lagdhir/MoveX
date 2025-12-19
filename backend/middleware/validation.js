const MAX_PAYLOAD_SIZE = 1e5; // 100KB

function validateEmail(email) {
	const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
	return regex.test(email) && email.length <= 255;
}

function validatePassword(password) {
	// minimum: 12 chars, letter, number (matching backend rule from password reset)
	return password && password.length >= 12 && /[A-Za-z]/.test(password) && /\d/.test(password);
}

// Middleware: reject oversized payloads early
function rejectLargePayloads(req, res, next) {
	if (req.headers['content-length'] && parseInt(req.headers['content-length'], 10) > MAX_PAYLOAD_SIZE) {
		return res.status(413).json({ message: 'Payload too large.' });
	}
	next();
}

// Middleware: enforce JSON content-type
function enforceJsonContentType(req, res, next) {
	if (req.method !== 'GET' && req.method !== 'DELETE') {
		const contentType = req.headers['content-type'] || '';
		if (!contentType.includes('application/json')) {
			return res.status(415).json({ message: 'Content-Type must be application/json.' });
		}
	}
	next();
}

// Middleware: validate login payload
function validateLoginPayload(req, res, next) {
	const { email, password } = req.body || {};
	if (!email || !validateEmail(email)) {
		return res.status(400).json({ message: 'Invalid request.' });
	}
	if (!password || typeof password !== 'string' || password.length < 1) {
		return res.status(400).json({ message: 'Invalid request.' });
	}
	next();
}

// Middleware: validate register payload
function validateRegisterPayload(req, res, next) {
	const { email, password, role } = req.body || {};
	if (!email || !validateEmail(email)) {
		return res.status(400).json({ message: 'Invalid request.' });
	}
	if (!validatePassword(password)) {
		return res.status(400).json({ message: 'Password does not meet requirements.' });
	}
	const validRoles = ['user', 'admin', 'franchisee', 'staff'];
	if (!role || !validRoles.includes(role)) {
		return res.status(400).json({ message: 'Invalid request.' });
	}
	next();
}

// Middleware: validate password reset payload
function validatePasswordResetPayload(req, res, next) {
	const { token, newPassword } = req.body || {};
	if (!token || typeof token !== 'string' || token.length < 10) {
		return res.status(400).json({ message: 'Invalid or expired token.' });
	}
	if (!validatePassword(newPassword)) {
		return res.status(400).json({ message: 'Password does not meet requirements.' });
	}
	next();
}

module.exports = {
	rejectLargePayloads,
	enforceJsonContentType,
	validateLoginPayload,
	validateRegisterPayload,
	validatePasswordResetPayload,
	validateEmail,
	validatePassword,
};
