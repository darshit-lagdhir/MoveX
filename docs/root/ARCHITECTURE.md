# MoveX Final Architecture

## System Overview

MoveX is a secure, online-first authentication and role-based access control system.

```
┌─────────────────────────────────────────────────────────────┐
│                        USERS (Clients)                       │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (UI Only)                        │
│  - HTML / CSS / JavaScript                                  │
│  - No security logic                                         │
│  - No auth decisions                                         │
│  - DevTools lockdown (UI cosmetic)                           │
│  - Calls backend APIs                                        │
│  - Reacts to backend responses                              │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS + JSON
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  BACKEND (Authority)                         │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  API Routes                                          │   │
│  │  - /auth/register                                    │   │
│  │  - /auth/login                                       │   │
│  │  - /auth/logout                                      │   │
│  │  - /auth/forgot-password                             │   │
│  │  - /auth/reset-password                              │   │
│  │  - /auth/me (protected)                              │   │
│  │  - /dashboard/* (protected, role-enforced)           │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Middleware                                          │   │
│  │  - authMiddleware (JWT validation)                   │   │
│  │  - rateLimiter (brute-force prevention)              │   │
│  │  - csrfProtection (state-change protection)          │   │
│  │  - validation (input sanitization)                   │   │
│  │  - securityHeaders (XSS / clickjacking prevention)   │   │
│  │  - authLogging (audit trail)                         │   │
│  └──────────────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  Security Measures                                   │   │
│  │  - Password hashing (bcrypt)                         │   │
│  │  - JWT tokens                                         │   │
│  │  - HttpOnly cookies                                  │   │
│  │  - CSRF tokens                                        │   │
│  │  - Session invalidation                               │   │
│  │  - Role-based access control                          │   │
│  │  - Generic error responses                            │   │
│  │  - Audit logging (no secrets)                         │   │
│  └──────────────────────────────────────────────────────┘   │
└──────────────────────────┬──────────────────────────────────┘
                           │ SQL + SSL
                           ▼
┌─────────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                       │
│  - users table (id, email, password_hash, role, status)     │
│  - password_reset_tokens table (hashed tokens, expiry)      │
│  - Session store (encrypted, short-lived)                   │
│  - Audit logs (auth events, no secrets)                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Security Authority

### Frontend
- **Authority:** NONE
- **Responsibilities:**
  - Display UI
  - Collect user input
  - Send API requests
  - React to responses
  - Store UI state only

- **Cannot Do:**
  - Validate credentials
  - Make auth decisions
  - Assign roles
  - Create sessions
  - Bypass rate limiting

### Backend
- **Authority:** 100% (ABSOLUTE)
- **Responsibilities:**
  - Validate all input
  - Authenticate users
  - Enforce authorization
  - Manage sessions
  - Assign roles
  - Log security events
  - Return generic errors

- **Cannot Be Bypassed By:**
  - Frontend logic
  - DevTools manipulation
  - Offline mode
  - Local storage tampering
  - Cookie modification

### Database
- **Authority:** Source of Truth
- **Responsibilities:**
  - Store user credentials (hashed)
  - Store reset tokens (hashed)
  - Store session data
  - Store audit logs
  - Enforce referential integrity

---

## Data Flow: User Login

```
1. User enters email + password in frontend
                     │
                     ▼
2. Frontend calls POST /auth/login (HTTPS, JSON)
   Header: X-CSRF-Token (required)
   Body: { email, password }
                     │
                     ▼
3. Backend receives request
   - Rate limiter checks (5 per 15 min)
   - CSRF token validated (single-use)
   - Input validation (email format, password length)
                     │
                     ▼
4. Backend queries database
   - Find user by email
   - Compare password (bcrypt)
   - Check user status (active)
                     │
                     ▼
5. Backend generates JWT token (1 hour expiry)
   - Payload: { userId, iat, exp }
   - Signed with JWT_SECRET
                     │
                     ▼
6. Backend sets HttpOnly cookie
   - sessionid: encrypted
   - SameSite: Strict
   - Secure: true (HTTPS only)
                     │
                     ▼
7. Backend returns HTTP 200
   Body: { token, role }
   Log: login_success event (no password)
                     │
                     ▼
8. Frontend stores token in sessionStorage (volatile)
   - Lost on tab close
   - Not accessible to XSS attacks
                     │
                     ▼
9. Frontend redirects to dashboard
   - Loads dashboard.html
   - Calls GET /auth/me (Authorization: Bearer token)
                     │
                     ▼
10. Backend validates token
    - Verify signature
    - Check expiry
    - Query user (current role)
    - Return user profile
                     │
                     ▼
11. Frontend displays dashboard
    - Role-specific content visible
    - All subsequent API calls include token
```

---

## Data Flow: Failed Login (Attack Attempt)

```
Attempt: Email: ' OR 1=1 --  Password: anything

1. Frontend sends request (same as above)
2. Backend rate limiter checks (if < 5, proceed)
3. Backend validates input → REJECTS: Invalid email format (HTTP 400)
4. Log: login_failed, reason: validation_error
5. Return generic: "Invalid credentials."

Result: Attacker learns NOTHING about system
```

---

## Key Security Principles

### 1. Backend Authority
- All security decisions made by backend
- Frontend cannot override
- Frontend is untrusted by design

### 2. Defense in Depth
- Input validation (format, length, type)
- Rate limiting (brute-force prevention)
- CSRF tokens (state-change protection)
- Password hashing (bcrypt, 12 rounds)
- Session management (HttpOnly, SameSite)
- Error obfuscation (generic messages)
- Audit logging (no secrets)

### 3. Zero Trust Frontend
- Frontend validation is cosmetic
- Backend validation is authoritative
- Frontend cannot create, modify, or skip auth
- Frontend is fully replaced with new UI without affecting security

### 4. Database is Source of Truth
- All auth state in database
- Sessions persisted (survive restarts)
- Tokens hashed before storage
- Passwords hashed with strong algorithm

### 5. No Offline Mode
- System requires backend connectivity
- No fallback to local authentication
- No offline security logic
- Frontend alone cannot log user in

---

## Deployment Architecture (Production)

```
┌──────────────────┐
│  DNS / CDN       │
│  (Cloudflare)    │
└────────┬─────────┘
         │
    ┌────┴─────────┬──────────────────┐
    │              │                  │
    ▼              ▼                  ▼
┌─────────┐  ┌──────────┐  ┌──────────────┐
│ Frontend │  │ Backend  │  │ Database     │
│ (Vercel) │  │(Railway) │  │ (AWS RDS)    │
└─────────┘  └──────────┘  └──────────────┘
    HTTPS       HTTPS         SSL
    Static      Node.js       Postgres
    HTML/CSS    Express       Encrypted
    JS          Auth API      Backups
               Rate Limit
               Logging
```

---

## Roles & Access Control

### Admin
- Can view all users
- Can manage franchises
- Can view analytics
- Can reset user passwords
- Can deactivate accounts

### Franchisee
- Can manage own franchise
- Can view own staff
- Can view own analytics
- Cannot view other franchises

### Staff
- Can process deliveries
- Can view assigned jobs
- Cannot manage other staff
- Cannot view analytics

### User
- Can request delivery
- Can track delivery
- Can view own history
- Cannot view other users' data

All access enforced by backend role checks before returning data.

---

## Incident Response

### If Credentials Leaked
1. All passwords are hashed (bcrypt) → useless to attacker
2. Change JWT_SECRET → all tokens invalidated
3. Users must re-login
4. Check logs for suspicious activity

### If Token Compromised
1. Token is short-lived (1 hour)
2. HttpOnly cookie limits XSS risk
3. Force logout if suspicious activity detected
4. Log all token validations

### If Database Breached
1. Passwords hashed → safe
2. Reset tokens hashed → safe
3. Change database password → revoke attacker access
4. Audit logs show what was accessed

### If Backend Compromised
1. Review audit logs
2. Identify compromised accounts
3. Force password reset
4. Redeploy clean version

---

## Performance & Scalability

### Horizontal Scaling
- Stateless backend (no session storage needed)
- Database connection pooling
- Load balancer distributes traffic
- Rate limiter per IP (distributed cache needed)

### Caching Strategy
- Frontend: Cache-Control: max-age=3600
- API: No caching (auth data real-time)
- Database: Index on email, userId

### Database Optimization
- Connection pooling (max 20 concurrent)
- Prepared statements (prevent SQL injection)
- Indexes on frequently queried columns
- Regular vacuum (PostgreSQL maintenance)

---

## Monitoring & Alerting

### Metrics to Track
- Request rate (requests/sec)
- Error rate (% failing requests)
- Login attempts (spike = attack)
- Rate limit hits (brute-force attempts)
- Database latency (slow = problem)
- Session validity (expiry tracking)

### Alerts
- > 10 failed logins from same IP → investigate
- > 50% error rate → alert ops team
- Database unavailable → page team
- CSRF tokens mismatching → possible attack

---

## Compliance

### GDPR
- User data stored securely
- Passwords cannot be retrieved
- User can request data export
- User can request account deletion

### PCI DSS (if handling payments)
- No payment data stored (tokenized)
- TLS 1.2+ enforced
- PCI-DSS compliance verified annually

### SOC 2
- Audit logs maintained
- Access controls enforced
- Incident response plan
- Annual security audit

---

## Conclusion

MoveX is a **production-grade, secure, online-first authentication system** built on:

✓ Backend Authority (not frontend)
✓ Database as source of truth
✓ Industry-standard security practices
✓ Defense in depth
✓ Zero offline fallback
✓ Scalable architecture
✓ Comprehensive logging
✓ Professional deployment

This system can safely handle real users, real data, and real security threats.
