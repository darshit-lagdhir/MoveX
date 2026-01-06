// Role-based access control middleware utilities

const Roles = Object.freeze({
  ADMIN: 'admin',
  FRANCHISEE: 'franchisee',
  STAFF: 'staff',
  USER: 'user'
});

function requireRole(...allowed) {
  return (req, res, next) => {
    // Simple check: Does session role match?
    if (req.session && allowed.includes(req.session.role)) {
      return next();
    }
    return res.status(403).json({ message: 'Forbidden' });
  };
}

module.exports = {
  Roles,
  requireRole
};


