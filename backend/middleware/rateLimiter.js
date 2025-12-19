const rateLimit = require('express-rate-limit');

// Login rate limiter: strict
const loginLimiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	max: Number(process.env.RATE_LIMIT_LOGIN || 5),
	message: 'Too many login attempts. Please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.method === 'OPTIONS',
	handler: (req, res) => {
		console.warn(`[SECURITY] Rate limit exceeded for login from IP ${req.ip}`);
		res.status(429).json({ message: 'Too many attempts. Please try again later.' });
	},
});

// Register rate limiter: strict
const registerLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: Number(process.env.RATE_LIMIT_REGISTER || 3),
	message: 'Too many registration attempts. Please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.method === 'OPTIONS',
	handler: (req, res) => {
		console.warn(`[SECURITY] Rate limit exceeded for register from IP ${req.ip}`);
		res.status(429).json({ message: 'Too many attempts. Please try again later.' });
	},
});

// Password reset rate limiter: strict
const forgotPasswordLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: Number(process.env.RATE_LIMIT_FORGOT_PASSWORD || 3),
	message: 'Too many password reset attempts. Please try again later.',
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.method === 'OPTIONS',
	handler: (req, res) => {
		console.warn(`[SECURITY] Rate limit exceeded for password reset from IP ${req.ip}`);
		res.status(429).json({ message: 'Too many attempts. Please try again later.' });
	},
});

// General API rate limiter: relaxed
const generalLimiter = rateLimit({
	windowMs: 15 * 60 * 1000,
	max: Number(process.env.RATE_LIMIT_GENERAL || 100),
	standardHeaders: true,
	legacyHeaders: false,
	skip: (req) => req.method === 'OPTIONS',
});

module.exports = { loginLimiter, registerLimiter, forgotPasswordLimiter, generalLimiter };
