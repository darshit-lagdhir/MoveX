# MoveX Backend - Security Authority Layer

## Purpose

This backend will serve as the **ONLY trusted authority** for all security decisions in the MoveX application.

---

## Core Responsibilities

### 🔐 Authentication
- Receive login credentials via POST requests
- Hash passwords using Argon2id (industry standard 2025) [web:6]
- Validate credentials against secure database
- Return success/failure with appropriate HTTP status codes
- **NEVER trust frontend validation**

### 👤 User Registration  
- Accept registration data from frontend
- Validate email uniqueness
- Hash passwords before storage (NEVER store plaintext)
- Create user records in PostgreSQL database
- Return registration confirmation

### 🎫 Session Management
- Issue HttpOnly, Secure, SameSite=Strict cookies [web:13][web:16]
- Generate JWT tokens with short expiration (15 min)
- Implement refresh token rotation
- Validate sessions on every protected endpoint
- Handle logout (token invalidation)

### 🛡️ Authorization
- Enforce role-based access control (RBAC)
- Verify user permissions for each action
- Return 403 Forbidden for unauthorized access
- **Frontend NEVER decides permissions**

### 🔑 Password Security
- Use Argon2id with recommended parameters
- Implement password reset via email tokens
- Enforce strong password policies server-side
- Log authentication attempts (rate limiting)

---

## Technology Stack (Planned)

- **Runtime:** Node.js 20+ / Python 3.11+
- **Framework:** Express.js / FastAPI
- **Database:** PostgreSQL 15+ with encrypted connections
- **Password Hashing:** Argon2id
- **Session:** JWT (HttpOnly cookies)
- **Security:** Helmet.js, CORS, rate limiting

---

## API Endpoints (Future)

POST /api/auth/login
POST /api/auth/register
POST /api/auth/logout
POST /api/auth/refresh
POST /api/auth/forgot-password
POST /api/auth/reset-password
GET /api/auth/session (validate current session)


---

## Security Principles

1. **Zero Trust Frontend** [web:14][web:15]
   - Validate ALL inputs from frontend
   - Never trust client-side role claims
   - Always verify sessions server-side

2. **Defense in Depth**
   - Multiple layers of validation
   - Rate limiting on auth endpoints
   - HTTPS-only communication
   - SQL injection prevention (parameterized queries)

3. **Principle of Least Privilege**
   - Users get minimum required permissions
   - Sessions expire quickly
   - Tokens cannot be extended indefinitely

---

## Current Status

- **Phase:** Documentation Only
- **Next Step:** Create backend skeleton (STEP 2)
- **Implementation:** Pending STEP 1 completion

---

## Active Structure

**Entry Point:** `src/app.js`
**Started by:** `npm start`

### Directory Layout

```
src/
├── app.js (main Express server) ← ACTIVE
├── routes/
│   ├── auth.routes.js (login, register, password reset)
│   └── protected.routes.js (authenticated endpoints)
├── controllers/
│   └── auth.controller.js
├── models/
│   └── user.model.js
├── config/
│   └── db.js (database connection)
├── rbac.js (role-based access control)
├── session.js (session management)
└── sessionMiddleware.js (session middleware)
```

## Deprecated Structure

The following folders are **NOT USED** in production:
- `routes/` (old)
- `middleware/` (old)
- `controllers/passwordResetController.js` (old)
- `app.js` (root level, old)

These are kept for reference only. Do NOT modify them.

## Running the Backend

```bash
npm install
npm start
```

Server runs on port 4000 (or `$PORT` env variable).

## Environment Variables

See `.env.example` for required configuration.
