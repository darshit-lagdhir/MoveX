// Role-based access control middleware utilities

const Roles = Object.freeze({
  ADMIN: 'admin',
  FRANCHISEE: 'franchisee',
  STAFF: 'staff',
  USER: 'user',
  CUSTOMER: 'customer'
});

function requireRole(...allowed) {
  return (req, res, next) => {
    const role = req.session?.role;
    if (!role || !allowed.includes(role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }
    next();
  };
}

module.exports = {
  Roles,
  requireRole
};


