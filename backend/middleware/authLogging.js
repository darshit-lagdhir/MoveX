function logAuthAttempt(event, details = {}) {
	if (process.env.LOG_AUTH_ATTEMPTS !== 'true') return;
	const timestamp = new Date().toISOString();
	const logEntry = {
		timestamp,
		event,
		ip: details.ip,
		email: details.email,
		userId: details.userId,
		reason: details.reason,
		// NEVER include: passwords, tokens, hashes
	};
	console.log(`[AUTH] ${JSON.stringify(logEntry)}`);
}

module.exports = { logAuthAttempt };
