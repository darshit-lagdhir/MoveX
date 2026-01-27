/**
 * ACTIVE BACKEND ENTRY POINT
 * 
 * This is the main Express server that runs in production.
 * Started by: npm start (node src/app.js)
 * 
 * All authentication, routes, and security middleware configured here.
 */

const path = require('path');
const dns = require('dns');

// FORCE IPv4: Fixes Render/Supabase ENETUNREACH errors
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
    // console.log('✅ DNS Resolution forced to: ipv4first');
  }
} catch (e) {
  // console.warn('⚠️ Could not set DNS result order:', e.message);
}

require('dotenv').config({ path: path.join(__dirname, '../../.env') }); // Load from main project folder

// Validate environment configuration early
require('../utils/validate-env');

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected.routes');
const dashboardRoutes = require('../routes/dashboard');
const profileRoutes = require('../routes/profile');
const shipmentRoutes = require('./routes/shipment.routes');

const app = express();

// SECURITY: Strict CORS configuration - only allow trusted origins
const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:3000',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:3000',
  ...(process.env.FRONTEND_URL ? process.env.FRONTEND_URL.split(',') : [])
].map(origin => origin.trim()).filter(Boolean);

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS request from: ${origin}. Allowing for now, but PLEASE set FRONTEND_URL in Environment Variables.`);
      callback(null, true);
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json({ limit: '10kb' })); // SECURITY: Limit request body size

/* ═══════════════════════════════════════════════════════════
   SECURITY HEADERS
   ═══════════════════════════════════════════════════════════ */
app.use((req, res, next) => {
  // Prevent clickjacking
  res.setHeader('X-Frame-Options', 'DENY');
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');
  // Content Security Policy
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;");
  // HSTS for production
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  // Prevent XSS in older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');
  // Referrer policy
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  next();
});



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

// SECURITY: Validate SESSION_SECRET is properly configured
const SESSION_SECRET = process.env.SESSION_SECRET;
if (!SESSION_SECRET) {
  console.error('❌ SECURITY ERROR: SESSION_SECRET environment variable is not set!');
  console.error('   Using a default value is UNSAFE for production.');
  process.exit(1);
}
if (SESSION_SECRET.length < 32) {
  console.warn('⚠️ SECURITY WARNING: SESSION_SECRET is shorter than recommended (32+ characters).');
}



/* ═══════════════════════════════════════════════════════════
   STATIC DASHBOARD PROTECTION (SERVER-SIDE)
   Blocks direct access to .html dashboards without valid session
   ═══════════════════════════════════════════════════════════ */
const sessionStore = require('./session');

const protectStaticDashboards = async (req, res, next) => {
  // Normalize path: Remove .html if present
  const normalizedPath = req.path.endsWith('.html') ? req.path.slice(0, -5) : req.path;
  const target = normalizedPath.substring(1); // remove leading slash

  // Simple mapping of who can see what
  // Hierarchy: admin > franchisee > staff > user
  const dashboardMap = {
    'dashboards/admin/admin-dashboard': ['admin'],
    'dashboards/franchisee/franchisee-dashboard': ['admin', 'franchisee'],
    'dashboards/franchisee': ['admin', 'franchisee'], // Legacy path support
    'dashboards/staff': ['admin', 'franchisee', 'staff'], // Legacy path support
    'dashboards/staff/staff-dashboard': ['admin', 'franchisee', 'staff'],
    'dashboards/franchisee/franchisee-assignments': ['admin', 'franchisee'], // New Task Assignment Page
    'dashboards/user/user-dashboard': ['admin', 'franchisee', 'staff', 'user']
  };

  if (dashboardMap[target]) {
    // SECURITY: Prevent caching of sensitive dashboard pages
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    // 1. Check for session cookie (Strict Server-Side Validation)
    const sid = req.cookies?.['movex.sid'];
    const session = await sessionStore.getSession(sid);

    if (!session) {
      // No valid session -> Redirect to Login
      return res.redirect('/?error=unauthorized');
    }

    // 2. Check Role Access
    const role = session.role;

    if (!dashboardMap[target].includes(role)) {
      const correctDashboardMap = {
        admin: 'dashboards/admin/admin-dashboard',
        franchisee: 'dashboards/franchisee/franchisee-dashboard',
        staff: 'dashboards/staff/staff-dashboard',
        user: 'dashboards/user/user-dashboard'
      };
      const correctDashboard = correctDashboardMap[role] || 'dashboards/user/user-dashboard';
      return res.redirect(`/${correctDashboard}?error=role_mismatch`);
    }
  }

  next();
};


/* ═══════════════════════════════════════════════════════════
   LOGIN PAGE AUTO-REDIRECT
   Redirects logged-in users away from the login page
   ═══════════════════════════════════════════════════════════ */
app.get(['/', '/index.html'], async (req, res, next) => {
  try {
    // If user explicitly logged out or has error message, DO NOT auto-redirect
    if (req.query.logout || req.query.auth_message) {
      return next();
    }

    const sid = req.cookies?.['movex.sid'];
    const session = sid ? await sessionStore.getSession(sid) : null;

    if (session && session.role) {
      const dashboards = {
        admin: '/dashboards/admin/admin-dashboard.html',
        franchisee: '/dashboards/franchisee/franchisee-dashboard.html',
        staff: '/dashboards/staff/staff-dashboard.html',
        user: '/dashboards/user/user-dashboard.html'
      };
      const target = dashboards[session.role];
      if (target) return res.redirect(target);
    }
  } catch (err) {
    console.warn('Auto-redirect check failed (non-critical):', err.message);
  }

  // If no session or error, serve index.html for root
  if (req.path === '/') {
    return res.sendFile(path.join(__dirname, '../../index.html'));
  }
  // Otherwise let other handlers (like express.static) handle it
  next();
});

app.use(protectStaticDashboards);
app.use(express.static(path.join(__dirname, '../../'), { extensions: ['html'] }));




app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', profileRoutes);

// Redirect-based logout (works across origins, only destroys CURRENT session)
app.get('/api/logout-redirect', async (req, res) => {
  try {
    const sessionStore = require('./session');
    const jwt = require('jsonwebtoken');
    const { clearSessionCookie } = require('./sessionMiddleware');

    let destroyed = false;

    // 1. Try cookie first (best method)
    const sid = req.cookies?.['movex.sid'];
    if (sid) {
      await sessionStore.destroySession(sid);
      destroyed = true;
    }

    // 2. Try JWT token from query
    if (!destroyed && req.query.token) {
      try {
        const decoded = jwt.verify(req.query.token, process.env.JWT_SECRET);

        // 2a. New JWTs have sessionToken - use it directly
        if (decoded && decoded.sessionToken) {
          await sessionStore.destroySession(decoded.sessionToken);
          destroyed = true;
        }
        // 2b. Old JWTs only have username - find their most recent session
        else if (decoded && decoded.username) {
          const db = require('./config/db');
          const result = await db.query(
            'SELECT token FROM sessions WHERE username = $1 ORDER BY last_accessed_at DESC LIMIT 1',
            [decoded.username]
          );
          if (result.rows.length > 0) {
            await sessionStore.destroySession(result.rows[0].token);
            destroyed = true;
          }
        }
      } catch (e) {
        // Token invalid or expired
      }
    }

    clearSessionCookie(res);

    // Redirect back to frontend
    const frontendUrl = process.env.FRONTEND_URL?.split(',')[0]?.trim() || '/';
    res.redirect(`${frontendUrl}/?logout=true`);
  } catch (e) {
    console.error('Logout redirect error:', e);
    res.redirect('/?logout=true');
  }
});

app.use('/api/shipments', shipmentRoutes);

/* ═══════════════════════════════════════════════════════════
   HEALTH CHECK ROUTES (Production Monitoring)
   ═══════════════════════════════════════════════════════════ */
const healthRoutes = require('../routes/health');
app.use('/api/health', healthRoutes);

/* ═══════════════════════════════════════════════════════════
   404 HANDLER (Must be after all routes)
   ═══════════════════════════════════════════════════════════ */
app.use((req, res, next) => {
  // Only handle API routes as 404 JSON
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({
      error: 'Not Found',
      message: 'The requested API endpoint does not exist'
    });
  }
  // Let static file handler deal with other 404s
  next();
});

/* ═══════════════════════════════════════════════════════════
   GLOBAL ERROR HANDLER (Production-Safe)
   Must be last middleware - catches unhandled errors
   ═══════════════════════════════════════════════════════════ */
app.use((err, req, res, next) => {
  // Log error details for debugging (but not in production logs without care)
  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    console.error('────────────────────────────────────────');
    console.error('[ERROR]', err.message);
    console.error(err.stack);
    console.error('────────────────────────────────────────');
  } else {
    // In production, log minimal error info
    console.error('[ERROR]', err.message, '| Path:', req.path, '| Method:', req.method);
  }

  // Handle specific error types
  if (err.name === 'UnauthorizedError' || err.status === 401) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Authentication required'
    });
  }

  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      error: 'Payload Too Large',
      message: 'Request body exceeds size limit'
    });
  }

  if (err.message && err.message.includes('CORS')) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Cross-origin request blocked'
    });
  }

  // Default error response
  // SECURITY: Never expose stack traces or internal error details to users
  res.status(err.status || 500).json({
    error: 'Internal Server Error',
    message: isProduction
      ? 'An unexpected error occurred. Please try again.'
      : err.message
  });
});

/* ═══════════════════════════════════════════════════════════
   SERVER STARTUP
   ═══════════════════════════════════════════════════════════ */
const PORT = process.env.PORT || 4000;

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  // In production, you might want to gracefully shutdown
  // For now, just log and continue
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ UNHANDLED REJECTION at:', promise);
  console.error('Reason:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
