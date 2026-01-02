const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { protect } = require('../middleware/authMiddleware');
const sessionStore = require('../src/session');

const pendingMfaChallenges = new Map();

// SECURITY: Helper to get session from cookie
async function getSessionFromRequest(req) {
    const sid = req.cookies?.['movex.sid'];
    return await sessionStore.getSession(sid);
}

// SECURITY: Require valid session for MFA initiation
router.post('/initiate', async (req, res) => {
    try {
        // Get userId from authenticated session, NOT from request body
        const session = await getSessionFromRequest(req);

        if (!session || !session.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userId = session.userId;

        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000;

        pendingMfaChallenges.set(userId.toString(), {
            code,
            expiresAt,
            attempts: 0
        });

        // SECURITY: Never log MFA codes in production
        if (process.env.NODE_ENV !== 'production') {
            console.log(`[MFA-DEV] Code generated for user ${userId}`);
        }

        res.json({
            success: true,
            message: 'MFA code sent',
            // Only expose code in development for testing
            devCode: process.env.NODE_ENV !== 'production' ? code : undefined
        });
    } catch (err) {
        console.error('MFA initiate error:', err.message);
        res.status(500).json({ message: 'Failed to initiate MFA' });
    }
});

// SECURITY: Require valid session for MFA verification
router.post('/verify', async (req, res) => {
    try {
        const { code } = req.body;

        // Get userId from authenticated session, NOT from request body
        const session = await getSessionFromRequest(req);

        if (!session || !session.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        const userId = session.userId;

        const challenge = pendingMfaChallenges.get(userId.toString());

        if (!challenge) {
            return res.status(400).json({ message: 'No MFA challenge found. Please try logging in again.' });
        }

        if (Date.now() > challenge.expiresAt) {
            pendingMfaChallenges.delete(userId.toString());
            return res.status(400).json({ message: 'MFA code expired. Please try again.' });
        }

        challenge.attempts++;
        if (challenge.attempts > 5) {
            pendingMfaChallenges.delete(userId.toString());
            return res.status(429).json({ message: 'Too many attempts. Please try logging in again.' });
        }

        // SECURITY: Use constant-time comparison to prevent timing attacks
        const codeMatch = crypto.timingSafeEqual(
            Buffer.from(challenge.code.padEnd(6, '0')),
            Buffer.from(String(code || '').padEnd(6, '0'))
        );

        if (!codeMatch) {
            return res.status(401).json({ message: 'Invalid MFA code' });
        }

        pendingMfaChallenges.delete(userId.toString());

        res.json({
            success: true,
            message: 'MFA verification successful'
        });
    } catch (err) {
        console.error('MFA verify error:', err.message);
        res.status(500).json({ message: 'MFA verification failed' });
    }
});

router.get('/status', protect, async (req, res) => {
    try {
        res.json({
            enabled: false,
            method: null
        });
    } catch (err) {
        res.status(500).json({ message: 'Failed to get MFA status' });
    }
});

module.exports = router;

