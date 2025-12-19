function securityHeaders(req, res, next) {
	// Prevent clickjacking
	res.setHeader('X-Frame-Options', 'DENY');
	// Prevent MIME sniffing
	res.setHeader('X-Content-Type-Options', 'nosniff');
	// Restrict content sources (no inline scripts)
	res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';");
	// Enforce HTTPS in production
	if (process.env.NODE_ENV === 'production') {
		res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
	}
	next();
}

module.exports = { securityHeaders };
