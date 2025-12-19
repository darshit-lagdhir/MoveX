/**
 * ACTIVE BACKEND ENTRY POINT
 * 
 * This is the main Express server that runs in production.
 * Started by: npm start (node src/app.js)
 * 
 * All authentication, routes, and security middleware configured here.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') }); // Load env vars explicitly
const express = require('express');
const cors = require('cors');
const session = require('express-session');
const passport = require('../config/passport');
const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected.routes');
const oauthRoutes = require('../routes/oauth');
const mfaRoutes = require('../routes/mfa');
const dashboardRoutes = require('../routes/dashboard');
const profileRoutes = require('../routes/profile');

const app = express();

app.use(cors({
  origin: true,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

/* ═══════════════════════════════════════════════════════════
   COOKIE PARSING (MUST BE BEFORE AUTH MIDDLEWARE)
   ═══════════════════════════════════════════════════════════ */
app.use((req, _res, next) => {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach(pair => {
    const [k, v] = pair.split('=').map(s => s && s.trim());
    if (k) cookies[k] = decodeURIComponent(v || '');
  });
  req.cookies = cookies;
  next();
});

app.use(session({
  secret: process.env.SESSION_SECRET || 'movex-session-secret-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: 'lax'
  }
}));

/* ═══════════════════════════════════════════════════════════
   STATIC DASHBOARD PROTECTION (SERVER-SIDE)
   Blocks direct access to .html dashboards without valid session
   ═══════════════════════════════════════════════════════════ */
const sessionStore = require('./session');

const protectStaticDashboards = (req, res, next) => {
  const protectedFiles = [
    '/admin/dashboard.html',
    '/dashboards/franchisee.html',
    '/dashboards/staff.html',
    '/dashboards/user.html',
    '/dashboards/customer.html'
  ];

  if (protectedFiles.includes(req.path)) {
    // 1. Check for session cookie (Strict Server-Side Validation)
    const sid = req.cookies?.['movex.sid'];
    const session = sessionStore.getSession(sid);

    if (!session) {
      // No valid session -> Redirect to Login
      return res.redirect('/?error=unauthorized');
    }

    // 2. Check Role Access
    const role = session.role;
    const target = req.path.substring(1); // remove leading slash

    // Simple mapping of who can see what
    // Hierarchy: admin > franchisee > staff > user > customer

    const dashboardMap = {
      'admin/dashboard.html': ['admin'],
      'dashboards/franchisee.html': ['admin', 'franchisee'],
      'dashboards/staff.html': ['admin', 'franchisee', 'staff'],
      'dashboards/user.html': ['admin', 'franchisee', 'staff', 'user'],
      'dashboards/customer.html': ['admin', 'franchisee', 'staff', 'user', 'customer']
    };

    if (!dashboardMap[target]?.includes(role)) {
      const correctDashboardMap = {
        admin: 'admin/dashboard.html',
        franchisee: 'dashboards/franchisee.html',
        staff: 'dashboards/staff.html',
        user: 'dashboards/user.html',
        customer: 'dashboards/customer.html'
      };
      const correctDashboard = correctDashboardMap[role] || 'dashboards/user.html';
      return res.redirect(`/${correctDashboard}?error=role_mismatch`);
    }

    // 3. Allowed -> Proceed
    next();
  } else {
    next();
  }
};

app.use(protectStaticDashboards);

app.use(passport.initialize());

app.use(express.static(path.join(__dirname, '../../')));


app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', profileRoutes);
app.use('/auth', oauthRoutes);
app.use('/api/mfa', mfaRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Auth API listening on port ${PORT}`);
});
