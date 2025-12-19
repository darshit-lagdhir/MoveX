/**
 * ⚠️ DEPRECATED: This file is NOT used in production
 * 
 * The active backend entry point is: src/app.js
 * This file is kept for reference only.
 * 
 * DO NOT modify this file.
 * All changes should be made in src/app.js instead.
 */

const express = require('express');
const app = express();

// Middleware imports
const { rejectLargePayloads, enforceJsonContentType } = require('./middleware/validation');
const { securityHeaders } = require('./middleware/securityHeaders');
const { generalLimiter } = require('./middleware/rateLimiter');

// Early middleware (before routes)
app.use(rejectLargePayloads);
app.use(enforceJsonContentType);
app.use(express.json());
app.use(securityHeaders);
app.use(generalLimiter);

// Route imports
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

// Mount routes
app.use('/api/auth', authRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Error handler (catch-all)
app.use((err, req, res, next) => {
	console.error('[ERROR]', err.message);
	res.status(err.status || 500).json({ message: 'Request not allowed.' });
});

// Only listen if this is the main module (not imported by tests)
if (require.main === module) {
	app.listen(process.env.PORT || 4000, () => {
		console.log('Server running on port', process.env.PORT || 4000);
	});
}

module.exports = app;