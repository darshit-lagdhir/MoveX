const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireSession, whoami } = require('../sessionMiddleware');

router.post('/register', authController.register);
router.get('/check-username/:username', authController.checkUsername);
router.post('/login', authController.login);
router.post('/logout', authController.logout);
router.post('/forgot-password', authController.forgotPassword);
router.post('/forgot-password-check', authController.checkRecoveryEligibility);
router.post('/reset-password-security', authController.verifyQuestions);
router.post('/reset-password', authController.resetPassword);

// Session utilities
router.get('/me', requireSession, whoami);

module.exports = router;


