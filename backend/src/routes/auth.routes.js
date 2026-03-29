const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { requireAuth, whoami } = require('../sessionMiddleware');

router.post('/register', authController.register);
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/logout', authController.logout);

// Protected routes (require X-User-Username header)
router.get('/me', requireAuth, whoami);
router.post('/change-password', requireAuth, authController.changePassword);

module.exports = router;
