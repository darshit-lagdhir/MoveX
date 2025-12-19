const express = require('express');
const { requireSession } = require('../sessionMiddleware');
const { requireRole, Roles } = require('../rbac');

const router = express.Router();

// Example protected endpoints per role.
router.get('/admin/dashboard', requireSession, requireRole(Roles.ADMIN), (req, res) => {
  res.json({ message: 'Welcome admin', user: { email: req.session.email, role: req.session.role } });
});

router.get('/franchise/dashboard', requireSession, requireRole(Roles.FRANCHISEE), (req, res) => {
  res.json({ message: 'Welcome franchisee', user: { email: req.session.email, role: req.session.role } });
});

router.get('/staff/dashboard', requireSession, requireRole(Roles.STAFF), (req, res) => {
  res.json({ message: 'Welcome staff', user: { email: req.session.email, role: req.session.role } });
});

router.get('/user/dashboard', requireSession, requireRole(Roles.USER), (req, res) => {
  res.json({ message: 'Welcome user', user: { email: req.session.email, role: req.session.role } });
});

module.exports = router;


