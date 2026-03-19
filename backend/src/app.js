/**
 * MOVEX BACKEND ENTRY POINT
 * 
 * Authentication: bcrypt password hashing only.
 * No JWT. No sessions table. Simple and clean.
 */

const path = require('path');
const dns = require('dns');

// FORCE IPv4: Fixes Render/Supabase ENETUNREACH errors
try {
  if (dns.setDefaultResultOrder) {
    dns.setDefaultResultOrder('ipv4first');
  }
} catch (e) {}

require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const protectedRoutes = require('./routes/protected.routes');
const dashboardRoutes = require('../routes/dashboard');
const profileRoutes = require('../routes/profile');
const shipmentRoutes = require('./routes/shipment.routes');

const app = express();

// ═══════════════════════════════════════════════════════════
// CORS & MIDDLEWARE
// ═══════════════════════════════════════════════════════════
app.use(cors({ 
  origin: '*', // Allow all origins since we don't use cookies anymore
  allowedHeaders: ['Content-Type', 'Authorization', 'X-User-Username']
}));
app.use(express.json({ limit: '10kb' }));

// Security Headers
app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

// Cache Control
app.use((req, res, next) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  res.setHeader('Pragma', 'no-cache');
  next();
});

// ═══════════════════════════════════════════════════════════
// STATIC FILES (Serve Frontend)
// ═══════════════════════════════════════════════════════════
app.use(express.static(path.join(__dirname, '../../'), { extensions: ['html'] }));

// ═══════════════════════════════════════════════════════════
// API ROUTES
// ═══════════════════════════════════════════════════════════
app.use('/api/auth', authRoutes);
app.use('/api/protected', protectedRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api', profileRoutes);
app.use('/api/shipments', shipmentRoutes);

// Simple Logout Redirect
app.get('/api/logout-redirect', (req, res) => {
  res.redirect('/?logout=true');
});

// ═══════════════════════════════════════════════════════════
// ERROR HANDLERS
// ═══════════════════════════════════════════════════════════
app.use((req, res, next) => {
  if (req.path.startsWith('/api/')) {
    return res.status(404).json({ error: 'Not Found' });
  }
  next();
});

app.use((err, req, res, next) => {
  console.error('[ERROR]', err.message);
  res.status(err.status || 500).json({ error: err.message || 'Internal Server Error' });
});

// ═══════════════════════════════════════════════════════════
// SERVER STARTUP
// ═══════════════════════════════════════════════════════════
const PORT = process.env.PORT || 4000;

process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
});

process.on('unhandledRejection', (reason) => {
  console.error('UNHANDLED REJECTION:', reason);
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
