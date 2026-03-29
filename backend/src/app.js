/**
 * MOVEX UNIFIED BACKEND
 * Simplified for Exam Presentation
 */

const path = require('path');
const express = require('express');
const cors = require('cors');

// LOAD CONFIG
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// IMPORT UNIFIED API
const apiRoutes = require('./api');

const app = express();

// MIDDLEWARE
app.use(cors({ origin: '*', allowedHeaders: ['Content-Type', 'X-User-Username'] }));
app.use(express.json());

// STATIC FRONTEND
app.use(express.static(path.join(__dirname, '../../'), { extensions: ['html'] }));

// API MOUNT
app.use('/api', apiRoutes);

// LOGOUT REDIRECT
app.get('/api/logout-redirect', (req, res) => res.redirect('/?logout=true'));

// START
const PORT = process.env.PORT || 4000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`✅ MoveX Server running on http://localhost:${PORT}`);
});
