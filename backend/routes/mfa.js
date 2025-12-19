const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const db = require('../db');
const { protect } = require('../middleware/authMiddleware');

const pendingMfaChallenges = new Map();

router.post('/initiate', async (req, res) => {
    try {
        const { userId } = req.body;
        
        const code = crypto.randomInt(100000, 999999).toString();
        const expiresAt = Date.now() + 5 * 60 * 1000;
        
        pendingMfaChallenges.set(userId.toString(), {
            code,
            expiresAt,
            attempts: 0
        });

        console.log(`[MFA] Code for user ${userId}: ${code}`);

        res.json({
            success: true,
            message: 'MFA code sent',
            devCode: process.env.NODE_ENV !== 'production' ? code : undefined
        });
    } catch (err) {
        console.error('MFA initiate error:', err);
        res.status(500).json({ message: 'Failed to initiate MFA' });
    }
});

router.post('/verify', async (req, res) => {
    try {
        const { userId, code } = req.body;
        
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

        if (challenge.code !== code) {
            return res.status(401).json({ message: 'Invalid MFA code' });
        }

        pendingMfaChallenges.delete(userId.toString());

        res.json({
            success: true,
            message: 'MFA verification successful'
        });
    } catch (err) {
        console.error('MFA verify error:', err);
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
