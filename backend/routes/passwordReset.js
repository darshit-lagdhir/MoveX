const express = require('express');
const router = express.Router();
const controller = require('../controllers/passwordResetController');

// Rate limiting / abuse prevention should be added in production (e.g., express-rate-limit middleware)
// All responses here are intentionally generic to prevent enumeration.

router.post('/forgot-password', controller.forgotPassword);
router.post('/reset-password', controller.resetPassword);

module.exports = router;
