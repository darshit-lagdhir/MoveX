# MoveX - Next Generation Logistics Platform

## Overview
MoveX is a full-stack logistics management platform with authentication, user roles, and dashboards for different user types (Admin, Franchisee, Staff, User, Customer).

## Architecture (SINGLE-PORT DESIGN)

**CRITICAL: Port 4000 is the ONLY allowed port (production)**
- In Replit dev environment: PORT env var is set to 5000 for preview
- In production: defaults to port 4000

### Backend (Node.js/Express)
- **Location**: `backend/`
- **Entry Point**: `backend/src/app.js`
- **Port**: `process.env.PORT || 4000`
- **Database**: PostgreSQL (via `DATABASE_URL` environment variable)
- **Serves**: Static frontend files + API routes

### Frontend (Static HTML/CSS/JS)
- **Location**: Root directory (`index.html`, `styles/`, `js/`)
- **Served by**: Express static middleware from backend
- **NO SEPARATE FRONTEND SERVER**

### Single-Origin Architecture
- ONE Express app serves everything
- ONE port exposed
- ONE origin for sessions/cookies
- OAuth callbacks point to same origin

### API Routes
- `/api/auth` - Authentication routes (login, register, forgot password, reset password)
- `/api/protected` - Protected routes requiring authentication

### Database Schema
- `users` table with roles (admin, franchisee, staff, user, customer) and status (active, disabled, suspended)
- `password_resets` table for password reset tokens

### Key Files
- `backend/src/app.js` - Main Express server (serves static + API)
- `backend/src/config/db.js` - Database configuration
- `js/auth-api.js` - Frontend authentication API calls (PRIMARY auth source)
- `index.html` - Main login/registration page (AUTHORITATIVE UI)
- `*-dashboard.html` - Role-specific dashboards

### Dashboards
- admin-dashboard.html
- franchisee-dashboard.html
- staff-dashboard.html
- user-dashboard.html
- customer-dashboard.html

## Running the Project
```bash
cd backend && npm start
```

## Environment Variables
- `DATABASE_URL` - PostgreSQL connection string (auto-configured by Replit)
- `PORT` - Server port (5000 in Replit dev, 4000 in production)

## Archived Files
- `/archive/frontend-ai-generated/` - Previously AI-generated parallel frontend (archived, not runnable)
