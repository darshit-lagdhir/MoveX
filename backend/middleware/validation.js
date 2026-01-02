const MAX_PAYLOAD_SIZE = 1e5; // 100KB

function validateUsername(username) {
	return username && typeof username === 'string' && username.trim().length >= 3;
}

function validatePhone(phone) {
	const phoneRegex = /^(\+91[\-\s]?)?[6-9]\d{9}$/;
	return phone && phoneRegex.test(phone);
}

// SECURITY: Password requirements - must match auth.controller.js MIN_PASSWORD_LENGTH
// Minimum 8 characters, at least one letter and one number
function validatePassword(password) {
	return password && password.length >= 8 && /[A-Za-z]/.test(password) && /\d/.test(password);
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
	const { username, password } = req.body || {};
	if (!username || !validateUsername(username)) {
		return res.status(400).json({ message: 'Invalid request.' });
	}
	if (!password || typeof password !== 'string' || password.length < 1) {
		return res.status(400).json({ message: 'Invalid request.' });
	}
	next();
}

// Middleware: validate register payload
function validateRegisterPayload(req, res, next) {
	const { username, password, role } = req.body || {};
	if (!username || !validateUsername(username)) {
		return res.status(400).json({ message: 'Invalid request.' });
	}
	if (!validatePassword(password)) {
		return res.status(400).json({ message: 'Password does not meet requirements.' });
	}
	// Check phone if provided (or make it mandatory as per user request flow implied mandatory input)
	// User said "made the column of it... same thing for phone number" -> imply these are now part of registration
	// The frontend enforces it, so backend should too.
	const { phone, full_name } = req.body;
	if (!full_name || full_name.trim().length === 0) {
		return res.status(400).json({ message: 'Name is required.' });
	}
	if (!phone || !validatePhone(phone)) {
		return res.status(400).json({ message: 'Valid Indian phone number is required.' });
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
	validatePasswordResetPayload,
	validateUsername,
	validatePassword,
};
