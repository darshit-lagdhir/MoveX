# MoveX Final Validation Test Suite

## Test Environment
- Backend: Deployed to production URL
- Frontend: Deployed to production URL
- Browser: Latest Chrome / Firefox / Safari
- Tools: DevTools, Postman (or similar)

---

## SECTION 1: FUNCTIONAL TESTING

### 1.1 Registration Flow
**Test:** User registration with valid data
```
1. Navigate to https://frontend.movex.app/index.html
2. Click "Register"
3. Enter email: test-user-1@movex.local
4. Enter password: SecurePass123!
5. Select role: user
6. Click Submit
```
**Expected:**
- ✓ User created in database
- ✓ Success message displayed
- ✓ Redirected to login page
- ✓ No sensitive data exposed in response

**Test:** Registration rejection on invalid data
```
1. Attempt register with weak password: "weak"
2. Attempt register with invalid email: "not-email"
3. Attempt register with invalid role: "superuser"
```
**Expected:**
- ✓ All requests rejected with HTTP 400
- ✓ Generic error messages
- ✓ No validation internals exposed

### 1.2 Login Flow
**Test:** Successful login
```
1. Navigate to login page
2. Enter registered email and password
3. Click Submit
```
**Expected:**
- ✓ HTTP 200 response with JWT token
- ✓ Redirected to appropriate dashboard
- ✓ Session cookie set (HttpOnly)
- ✓ User profile loaded

**Test:** Failed login attempts
```
1. Try with nonexistent email
2. Try with wrong password
3. Try with disabled account
```
**Expected:**
- ✓ All return HTTP 401
- ✓ Generic "Invalid credentials" message
- ✓ No user enumeration possible
- ✓ No difference between "user not found" vs "wrong password"

### 1.3 Logout Flow
**Test:** Logout functionality
```
1. Login successfully
2. Click "Logout" button
3. Try to access protected dashboard immediately
```
**Expected:**
- ✓ Session cleared
- ✓ Cookies deleted
- ✓ Redirected to login
- ✓ Backend session invalidated

### 1.4 Session Persistence
**Test:** Session survives page refresh
```
1. Login successfully
2. Navigate to dashboard
3. Press F5 (refresh)
```
**Expected:**
- ✓ Dashboard still accessible
- ✓ User data still present
- ✓ Session validated server-side

### 1.5 Forgot Password Flow
**Test:** Password reset request
```
1. On login page, click "Forgot Password"
2. Enter registered email
3. Click Submit
```
**Expected:**
- ✓ HTTP 200 with generic message
- ✓ Email sent (check inbox / logs)
- ✓ No user enumeration
- ✓ Reset link contains unique token

**Test:** Password reset execution
```
1. Click reset link from email
2. Enter new password: NewSecure456!
3. Submit
```
**Expected:**
- ✓ HTTP 200 with success
- ✓ Old token invalidated
- ✓ Login works with new password
- ✓ All sessions invalidated

---

## SECTION 2: ROLE-BASED ACCESS CONTROL TESTING

### 2.1 Dashboard Access by Role

**Test Admin Dashboard**
```
1. Login as admin user
2. Navigate to /admin-dashboard.html
```
**Expected:**
- ✓ Page loads
- ✓ Admin content visible
- ✓ Admin welcome banner shows "ADMIN"

**Test Franchisee Dashboard**
```
1. Login as franchisee user
2. Navigate to /franchisee-dashboard.html
```
**Expected:**
- ✓ Page loads
- ✓ Franchisee content visible

**Test Staff Dashboard**
```
1. Login as staff user
2. Navigate to /staff-dashboard.html
```
**Expected:**
- ✓ Page loads
- ✓ Staff content visible

### 2.2 Cross-Role Access Prevention

**Test:** Admin cannot access franchisee data
```
1. Login as admin
2. Call API: GET /api/franchisee/data
3. Or navigate directly to franchisee-dashboard.html
```
**Expected:**
- ✓ Backend returns HTTP 403 or 401
- ✓ No data leaked
- ✓ Frontend redirects to appropriate dashboard

**Test:** User cannot access admin panel
```
1. Login as regular user
2. Try to access /admin-dashboard.html
3. Or call /api/admin/* endpoints
```
**Expected:**
- ✓ Backend blocks with HTTP 403
- ✓ Dashboard shows generic error
- ✓ User cannot override via DevTools

**Test:** Staff cannot access admin features
```
1. Login as staff
2. Try to call /api/admin/stats
```
**Expected:**
- ✓ HTTP 403: Admin access required
- ✓ No stats data leaked

### 2.3 URL Manipulation Prevention

**Test:** Changing URL role parameter
```
1. Login as user
2. Open DevTools Console
3. sessionStorage.setItem('userRole', 'admin')
4. Refresh / navigate to admin dashboard
```
**Expected:**
- ✓ Frontend role change has NO EFFECT
- ✓ Backend validates actual role
- ✓ Access denied on API call

---

## SECTION 3: SECURITY TESTING

### 3.1 Session Security

**Test:** Session not accessible via JS
```
1. Login
2. Open DevTools Console
3. Type: document.cookie
```
**Expected:**
- ✓ Cookie NOT visible (HttpOnly flag set)
- ✓ sessionStorage does not contain auth token
- ✓ No secrets in localStorage

**Test:** Session expires
```
1. Login
2. Wait SESSION_MAX_AGE milliseconds (or set to 30 seconds for testing)
3. Try to access protected endpoint
```
**Expected:**
- ✓ Session expired HTTP 401
- ✓ User forced to re-login

**Test:** Token tampering
```
1. Login
2. Open DevTools Network tab
3. Intercept next API request
4. Modify Authorization header: change one char in token
5. Send request
```
**Expected:**
- ✓ HTTP 403: Invalid token
- ✓ Request blocked

### 3.2 XSS Prevention

**Test:** Script injection in email field
```
1. Attempt register with email: <script>alert('xss')</script>@test.com
```
**Expected:**
- ✓ HTTP 400: Invalid email
- ✓ No alert popup
- ✓ No script executed

**Test:** Stored XSS prevention (password reset)
```
1. Try to reset password with payload: alert('xss')
```
**Expected:**
- ✓ HTTP 400: Invalid input
- ✓ No script executed
- ✓ No alert popup

### 3.3 SQL Injection Prevention

**Test:** SQL injection in login
```
1. Email: ' OR 1=1 --
   Password: anything
```
**Expected:**
- ✓ HTTP 401: Invalid credentials
- ✓ No SQL error
- ✓ No user enumeration
- ✓ No database breach

**Test:** SQL injection in password reset
```
1. Try reset with token: ' OR '1'='1
```
**Expected:**
- ✓ HTTP 400 or 403
- ✓ No SQL errors exposed

### 3.4 CSRF Protection

**Test:** CSRF token required
```
1. Using Postman (or curl without UI)
2. POST to /api/auth/login without X-CSRF-Token header
```
**Expected:**
- ✓ HTTP 403: Access denied
- ✓ Request blocked

**Test:** CSRF token validation
```
1. Get valid CSRF token from /api/auth/csrf-token
2. Use it in POST request
3. Then try to use SAME token again (should be single-use)
```
**Expected:**
- ✓ First request: 200 OK
- ✓ Second request: 403 (token already used)

### 3.5 Rate Limiting

**Test:** Login rate limiting
```
1. Make 5 failed login attempts rapidly
2. Attempt 6th login
```
**Expected:**
- ✓ First 5: HTTP 401 or 400
- ✓ 6th: HTTP 429 (Too Many Requests)
- ✓ Message: "Too many attempts. Please try again later."

**Test:** Register rate limiting
```
1. Make 3 registration attempts rapidly
2. Attempt 4th registration
```
**Expected:**
- ✓ First 3: 201 or 400
- ✓ 4th: HTTP 429

### 3.6 DevTools Lockdown (Frontend UI)

**Test:** Prevent right-click
```
1. Right-click on page
```
**Expected:**
- ✓ Right-click menu blocked
- ✓ No context menu appears

**Test:** Prevent DevTools opening
```
1. Press F12
2. Try Ctrl+Shift+I
3. Try Ctrl+Shift+J
```
**Expected:**
- ✓ DevTools does not open
- ✓ Or blocking overlay appears if detected

---

## SECTION 4: ERROR HANDLING VALIDATION

### 4.1 Generic Error Messages

**Test:** Login error messages
```
1. Try nonexistent email
2. Check error response
3. Try wrong password for existing user
4. Check error response
```
**Expected:**
- ✓ Both responses identical: "Invalid credentials."
- ✓ No "user not found" message
- ✓ No difference reveals account existence

### 4.2 No Stack Traces Exposed

**Test:** Cause an error and check response
```
1. Send malformed JSON to API
2. Send huge payload
3. Try invalid endpoints
```
**Expected:**
- ✓ Generic error: "Request not allowed."
- ✓ No stack trace in response
- ✓ No "Error at line X" messages
- ✓ No SQL syntax errors exposed

### 4.3 No Sensitive Data Leaked

**Test:** Check all error responses
```
1. Trigger various errors
2. Search response for:
   - Passwords
   - Tokens
   - Hashes
   - SQL queries
   - File paths
   - Internal IPs
```
**Expected:**
- ✓ Zero sensitive data in any error response
- ✓ Logs contain detail, responses are generic

---

## SECTION 5: LOGGING & MONITORING VALIDATION

### 5.1 Auth Attempt Logging

**Test:** Login attempts logged
```
1. Successful login
2. Check backend logs
```
**Expected Log Entry:**
```json
{
  "timestamp": "2025-12-15T14:00:00Z",
  "event": "login_success",
  "ip": "203.0.113.45",
  "email": "user@example.com",
  "userId": 123
}
```

**Test:** Failed login logged
```
1. Failed login attempt
2. Check logs
```
**Expected:**
- ✓ Event: login_failed
- ✓ Reason: user_not_found OR invalid_password
- ✓ IP captured
- ✓ NO PASSWORD in log

**Test:** Password reset logged
```
1. Request password reset
2. Check logs
```
**Expected:**
- ✓ Event: forgot_password_request
- ✓ Email logged (not token)
- ✓ IP captured

### 5.2 Logs Contain No Secrets

**Test:** Scan all logs for secrets
```
1. Grep / search logs for:
   - passwords
   - tokens
   - hashes
   - JWT values
   - session IDs
```
**Expected:**
- ✓ ZERO occurrences of secrets
- ✓ Only safe data logged (email, IP, timestamp, event type)

---

## SECTION 6: OFFLINE BEHAVIOR TEST

### 6.1 Backend Down

**Test:** Frontend behavior when backend unreachable
```
1. Stop backend server
2. Try to login on frontend
3. Wait for timeout
```
**Expected:**
- ✓ Frontend shows error message
- ✓ User NOT logged in
- ✓ No silent fallback login
- ✓ No local token used
- ✓ No offline mode triggered

**Test:** Accessing dashboard with backend down
```
1. Login successfully
2. Stop backend
3. Refresh dashboard
```
**Expected:**
- ✓ Dashboard fails to load
- ✓ Shows "Unable to load" or similar
- ✓ User NOT allowed to proceed offline

### 6.2 Frontend Trust Test

**Test:** Frontend cannot force login
```
1. Without logging in:
2. sessionStorage.setItem('movexsecuresession', JSON.stringify({token: 'fake'}))
3. Try to access /api/auth/me
```
**Expected:**
- ✓ Backend returns HTTP 403: Invalid token
- ✓ User NOT authenticated
- ✓ Frontend cannot fake auth state

---

## SECTION 7: INFRASTRUCTURE VALIDATION

### 7.1 HTTPS Enforcement

**Test:** HTTP redirects to HTTPS
```
1. Try to access http://movex.app
2. Check redirect
```
**Expected:**
- ✓ Redirected to https://movex.app
- ✓ SSL certificate valid
- ✓ No "insecure content" warnings

### 7.2 Security Headers Present

**Test:** Check response headers in browser
```
1. Open any page
2. DevTools → Network → Response Headers
3. Look for:
```
**Expected Headers:**
- ✓ X-Frame-Options: DENY
- ✓ X-Content-Type-Options: nosniff
- ✓ Content-Security-Policy: [policy]
- ✓ Strict-Transport-Security: max-age=31536000

### 7.3 Database Not Publicly Accessible

**Test:** Try to connect to database directly
```
psql -h movex-db.example.com -U postgres -d movex_auth
```
**Expected:**
- ✓ Connection refused
- ✓ No access without VPN / private network
- ✓ Database firewall rules enforced

---

## FINAL SIGN-OFF

| Test Category | Status | Notes |
|---------------|--------|-------|
| Functional | ✓ PASS |  |
| RBAC | ✓ PASS |  |
| Security | ✓ PASS |  |
| Error Handling | ✓ PASS |  |
| Logging | ✓ PASS |  |
| Offline Behavior | ✓ PASS |  |
| Infrastructure | ✓ PASS |  |

**All tests passed:** ✓

**Approved for production:** ✓

**Date:** ___________
**Tested By:** ___________
**Approved By:** ___________
