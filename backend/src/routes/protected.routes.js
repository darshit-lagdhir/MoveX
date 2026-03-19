const express = require('express');
const { requireAuth, requireRole } = require('../sessionMiddleware');

const router = express.Router();

const Roles = { ADMIN: 'admin', FRANCHISEE: 'franchisee', STAFF: 'staff', USER: 'user' };

router.get('/admin/dashboard', requireAuth, requireRole(Roles.ADMIN), (req, res) => {
  res.json({ message: 'Welcome admin', user: { username: req.user.username, role: req.user.role } });
});

router.get('/franchise/dashboard', requireAuth, requireRole(Roles.FRANCHISEE), (req, res) => {
  res.json({ message: 'Welcome franchisee', user: { username: req.user.username, role: req.user.role } });
});

router.get('/staff/dashboard', requireAuth, requireRole(Roles.STAFF), (req, res) => {
  res.json({ message: 'Welcome staff', user: { username: req.user.username, role: req.user.role } });
});

router.get('/user/dashboard', requireAuth, requireRole(Roles.USER), (req, res) => {
  res.json({ message: 'Welcome user', user: { username: req.user.username, role: req.user.role } });
});

module.exports = router;
