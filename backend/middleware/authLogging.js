/**
 * Authentication Logging Middleware
 * 
 * Logs authentication events (login, register, logout, etc.)
 * with production-safe data masking.
 * 
 * SECURITY: Never logs passwords, tokens, or full session data.
 */

const isProduction = process.env.NODE_ENV === 'production';

/**
 * Mask email for privacy in logs
 * user@example.com -> u***r@e****e.com
 */
function maskEmail(email) {
	if (!email || !isProduction) return email;

	const [local, domain] = email.split('@');
	if (!domain) return '***@***.***';

	const maskedLocal = local.length > 2
		? local[0] + '***' + local[local.length - 1]
		: '***';

	const domainParts = domain.split('.');
	const maskedDomain = domainParts[0].length > 2
		? domainParts[0][0] + '****' + domainParts[0][domainParts[0].length - 1]
		: '****';

	return `${maskedLocal}@${maskedDomain}.${domainParts.slice(1).join('.')}`;
}

/**
 * Mask IP address for privacy in logs (last octet)
 * 192.168.1.100 -> 192.168.1.xxx
 */
function maskIP(ip) {
	if (!ip || !isProduction) return ip;

	// Handle IPv6-mapped IPv4 (::ffff:192.168.1.1)
	if (ip.startsWith('::ffff:')) {
		ip = ip.substring(7);
	}

	const parts = ip.split('.');
	if (parts.length === 4) {
		parts[3] = 'xxx';
		return parts.join('.');
	}

	return ip; // Return as-is if not standard IPv4
}

/**
 * Log authentication attempt
 * 
 * @param {string} event - Event type (login_success, login_failed, register_success, etc.)
 * @param {object} details - Event details (ip, email, userId, reason)
 */
function logAuthAttempt(event, details = {}) {
	// Check if auth logging is enabled
	if (process.env.LOG_AUTH_ATTEMPTS !== 'true') return;

	const timestamp = new Date().toISOString();

	// Build log entry with masked sensitive data
	const logEntry = {
		timestamp,
		event,
		ip: maskIP(details.ip),
		email: maskEmail(details.email),
		userId: details.userId,
		reason: details.reason
		// NEVER include: passwords, tokens, hashes, session data
	};

	// Remove undefined fields for cleaner logs
	Object.keys(logEntry).forEach(key => {
		if (logEntry[key] === undefined) {
			delete logEntry[key];
		}
	});

	// Format: [AUTH] {"timestamp":"...","event":"login_success",...}
	console.log(`[AUTH] ${JSON.stringify(logEntry)}`);
}

/**
 * Log security events (rate limiting, CSRF failures, etc.)
 * 
 * @param {string} event - Event type
 * @param {object} details - Event details
 */
function logSecurityEvent(event, details = {}) {
	const timestamp = new Date().toISOString();

	const logEntry = {
		timestamp,
		event,
		ip: maskIP(details.ip),
		path: details.path,
		method: details.method,
		message: details.message
	};

	// Remove undefined fields
	Object.keys(logEntry).forEach(key => {
		if (logEntry[key] === undefined) {
			delete logEntry[key];
		}
	});

	console.warn(`[SECURITY] ${JSON.stringify(logEntry)}`);
}

module.exports = {
	logAuthAttempt,
	logSecurityEvent,
	maskEmail,
	maskIP
};
