/**
 * ACTIVE BACKEND ENTRY POINT
 * 
 * This is the main Express server that runs in production.
 * Started by: npm start (node src/app.js)
 * 
 * All authentication, routes, and security middleware configured here.
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') }); // Load from main project folder

// Validate environment configuration early
require('../utils/validate-env');

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected.routes');
const mfaRoutes = require('../routes/mfa');
const dashboardRoutes = require('../routes/dashboard');
const profileRoutes = require('../routes/profile');
const shipmentRoutes = require('./routes/shipment.routes');
// DISABLED: Photo storage not needed currently.
// To enable: 1) Uncomment this line  2) Uncomment app.use below  3) Set up Supabase Storage
// const photosRoutes = require('../routes/photos');

const app = express();

// SECURITY: Strict CORS configuration - only allow trusted origins
const allowedOrigins = [
  'http://localhost:4000',
  'http://localhost:3000',
  'http://127.0.0.1:4000',
  'http://127.0.0.1:3000',
  process.env.FRONTEND_URL // Production URL from .env
].filter(Boolean); // Remove undefined/null entries

app.use(cors({
  origin: function (origin, callback) {
    // Allow requests with no origin (same-origin, mobile apps, curl, etc.)
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(`[SECURITY] CORS blocked request from: ${origin}`);
      callback(new Error('Not allowed by CORS'));
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
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:;");
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
  // Hierarchy: admin > franchisee > staff > user > customer
  const dashboardMap = {
    'admin/dashboard': ['admin'],
    'dashboards/franchisee': ['admin', 'franchisee'],
    'dashboards/staff': ['admin', 'franchisee', 'staff'],
    'dashboards/user': ['admin', 'franchisee', 'staff', 'user'],
    'dashboards/customer': ['admin', 'franchisee', 'staff', 'user', 'customer']
  };

  if (dashboardMap[target]) {
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
        admin: 'admin/dashboard',
        franchisee: 'dashboards/franchisee',
        staff: 'dashboards/staff',
        user: 'dashboards/user',
        customer: 'dashboards/customer'
      };
      const correctDashboard = correctDashboardMap[role] || 'dashboards/user';
      return res.redirect(`/${correctDashboard}?error=role_mismatch`);
    }
  }

  next();
};

app.use(protectStaticDashboards);

app.use(express.static(path.join(__dirname, '../../'), { extensions: ['html'] }));


app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', profileRoutes);
app.use('/api', profileRoutes);
app.use('/api/shipments', shipmentRoutes);
app.use('/api/mfa', mfaRoutes);
// DISABLED: Photo storage - uncomment when ready to use Supabase Storage
// app.use('/api/photos', photosRoutes);

/* ═══════════════════════════════════════════════════════════
   HEALTH CHECK ROUTES (Production Monitoring)
   ═══════════════════════════════════════════════════════════ */
const healthRoutes = require('../routes/health');
app.use('/api/health', healthRoutes);

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../../index.html'));
});

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
