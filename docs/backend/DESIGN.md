# MoveX Online Authentication Flow - Design Specification

## Authentication Flow (Future Implementation)

### Login Sequence

┌─────────┐ ┌─────────┐ ┌──────────┐
│ Browser │ │ Backend │ │ Database │
└────┬────┘ └────┬────┘ └─────┬────┘
│ │ │
│ 1. User submits form │ │
│ POST /api/auth/login │ │
│ { username, password, role } │ │
├───────────────────────────>│ │
│ │ │
│ │ 2. Query user by username │
│ ├─────────────────────────────>│
│ │ │
│ │ 3. Return user record │
│ │ (with hashed password) │
│ │<─────────────────────────────┤
│ │ │
│ │ 4. Compare: │
│ │ argon2.verify( │
│ │ inputPassword, │
│ │ storedHash │
│ │ ) │
│ │ │
│ │ 5. If valid: │
│ │ - Generate JWT token │
│ │ - Create HttpOnly cookie │
│ │ - Log login event │
│ │ │
│ 6. Response: │ │
│ Set-Cookie: session=... │ │
│ { success: true, │ │
│ role: "admin", │ │
│ redirect: "/admin" } │ │
│<───────────────────────────┤ │
│ │ │
│ 7. Frontend redirects │ │
│ (based on backend data) │ │
│ │ │


### Key Security Decisions

#### ❌ What Frontend CANNOT Do:
- Determine if password is correct
- Decide user's role
- Create session tokens
- Validate authentication

#### ✅ What Backend MUST Do:
- Receive plaintext password over HTTPS
- Hash password with Argon2id
- Compare hashes using constant-time comparison
- Generate cryptographically secure session tokens
- Return authoritative authentication result

---

## Registration Flow

Frontend Backend Database
│ │ │
│ POST /api/auth/register│ │
│ { username, password, │ │
│ role, name } │ │
├───────────────────────>│ │
│ │ │
│ │ 1. Validate inputs: │
│ │ - Username format │
│ │ - Password strength │
│ │ - Role validity │
│ │ │
│ │ 2. Check username exists │
│ ├───────────────────────>│
│ │<───────────────────────┤
│ │ │
│ │ 3. Hash password │
│ │ hash = argon2.hash() │
│ │ │
│ │ 4. Store user record │
│ ├───────────────────────>│
│ │<───────────────────────┤
│ │ │
│ { success: true, │ │
│ message: "Created" } │ │
│<───────────────────────┤ │


---

## Password Security Standards

### Argon2id Configuration (2025 Recommended)

argon2.hash(password, {
type: argon2.argon2id,
timeCost: 3, // iterations
memoryCost: 65536, // 64 MB
parallelism: 4 // threads
})


### Why Not PBKDF2? [web:6]
While frontend currently uses PBKDF2-600K (acceptable), Argon2id is superior because:
- Memory-hard (resists GPU/ASIC attacks)
- Winner of Password Hashing Competition
- Recommended by OWASP 2025

---

## Session Token Structure

### JWT Payload (Backend-Generated)

{
"sub": "user_uuid",
"username": "admin@movex",
"role": "admin",
"iat": 1734249600,
"exp": 1734250500,
"jti": "unique_token_id"
}


### Storage Method
- **Backend:** Signs JWT with secret key
- **Browser:** Receives as HttpOnly cookie [web:13][web:16]
- **Frontend:** Cannot access token (security)

---

## Forgot Password Flow

User enters username

Backend generates secure random token (32 bytes)

Store token in database with 1-hour expiration

Send email with reset link: /reset?token=...

User clicks link

Frontend sends token to backend

Backend validates token (not expired, exists)

User sets new password

Backend hashes and updates password

Invalidate reset token


---

## Migration Phases

### Phase 1: Offline Prototype (Current)
- All logic in frontend
- Educational/demonstration purpose
- localStorage-based vault

### Phase 2: Backend Integration (Next)
- Create backend API
- Frontend calls API endpoints
- Backend validates everything
- HttpOnly cookie sessions

### Phase 3: Production Hardening (Future)
- Add rate limiting
- Implement 2FA
- Add audit logging
- Security monitoring

---

## Trust Boundaries

┌────────────────────────┐
│ UNTRUSTED ZONE │
│ │
│ - Browser JavaScript │
│ - localStorage │
│ - sessionStorage │
│ - Client-side crypto │
│ │
│ ❌ Never makes final │
│ security decisions │
└────────────────────────┘
│
│ HTTPS (TLS 1.3)
▼
┌────────────────────────┐
│ TRUSTED ZONE │
│ │
│ - Backend API │
│ - Database │
│ - Server-side hashing │
│ - Session management │
│ │
│ ✅ ONLY authority │
│ for security │
└────────────────────────┘


---

## Implementation Status

- **Current:** Design documentation only
- **Next:** STEP 2 - Backend skeleton creation
- **Blocker:** Must complete STEP 1 first
