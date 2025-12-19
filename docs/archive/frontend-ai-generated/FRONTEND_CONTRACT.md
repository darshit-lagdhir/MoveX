# MoveX Frontend Contract - Responsibility Boundaries

## Frontend IS Allowed To:

✅ **User Interface**
- Render HTML/CSS
- Handle animations and transitions
- Show loading states
- Display error messages from backend

✅ **Input Collection**
- Capture form data (email, password, role selection)
- Perform basic client-side validation:
  - Empty field checks
  - Email format verification
  - Password length requirements (UX only)

✅ **API Communication** (Future)
- Send POST requests to backend
- Receive and parse JSON responses
- Handle network errors gracefully

✅ **User Experience**
- Store non-sensitive UI preferences (theme, language)
- Manage form state (show/hide password)
- Provide instant feedback before backend response

---

## Frontend MUST NOT:

❌ **Security Decisions**
- Decide if login is successful
- Determine user roles or permissions
- Validate password correctness
- Create or validate sessions

❌ **Secret Management**
- Store passwords (even temporarily)
- Store authentication tokens in localStorage
- Trust any client-side "session" as authoritative
- Perform authorization checks

❌ **Business Logic**
- Enforce access control
- Decide which dashboard to show
- Validate user permissions
- Make security-critical decisions

---

## Trust Model

┌─────────────────────────────────────┐
│ BROWSER (Untrusted Environment) │
│ │
│ - User controls DevTools │
│ - JavaScript can be modified │
│ - Storage can be edited │
│ - Network requests can be forged │
└─────────────────────────────────────┘
│
│ HTTPS Only
▼
┌─────────────────────────────────────┐
│ BACKEND (Trusted Authority) │
│ │
│ - Validates ALL inputs │
│ - Stores passwords securely │
│ - Issues session tokens │
│ - Enforces permissions │
└─────────────────────────────────────┘

text

**Golden Rule:** Never trust anything from the frontend [web:14][web:20]

---

## Current Status

- **Phase:** Offline Prototype
- **Mode:** Simulation (all logic client-side)
- **Next:** Backend integration (backend becomes authority)