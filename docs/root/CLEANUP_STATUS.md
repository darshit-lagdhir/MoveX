# MoveX Codebase Cleanup Status

## Date: December 15, 2025

### Backend Cleanup

**Deprecated (Not Removed - Safe References):**
- ✗ `backend/app.js` (root level) — old entry point
- ✗ `backend/routes/` — old route structure
- ✗ `backend/middleware/` — old middleware (except used ones)
- ✗ `backend/controllers/passwordResetController.js` — old controller
- ✗ `backend/models/resetTokenModel.js` — old model

**Active (Keep Using):**
- ✓ `backend/src/app.js` — main entry point
- ✓ `backend/src/routes/auth.routes.js` — auth endpoints
- ✓ `backend/src/routes/protected.routes.js` — protected endpoints
- ✓ `backend/src/controllers/auth.controller.js` — auth logic
- ✓ `backend/src/models/user.model.js` — user model
- ✓ `backend/src/config/db.js` — database config
- ✓ `backend/src/rbac.js` — role-based access control
- ✓ `backend/src/session.js` — session management

### Frontend Cleanup

**Deprecated (Keep for Compatibility):**
- ✗ `frontend/src/utils/tamper.js` — older lockdown implementation

**Active (Use These):**
- ✓ `frontend/src/utils/lockdown.js` — modern UX deterrent
- ✓ `frontend/src/utils/auth-secure.js` — API coordinator
- ✓ `frontend/src/main.js` — app entry point

### Why This Structure?

The backend evolved from two separate implementations:
1. Root-level files (old, abandoned)
2. `src/` folder (modern, active, working)

Instead of risky refactoring, we've:
- Marked old code as deprecated
- Documented the active structure
- Preserved everything (zero breakage)
- Future cleanup can safely remove deprecated files

### Future Steps

Once confident the system is stable, deprecated files can be **safely deleted** without risk.

### Testing Notes

- ✓ Backend starts: `npm start`
- ✓ All routes work from `src/routes/`
- ✓ Frontend authentication works
- ✓ Lockdown (UX deterrent) active
- ✓ No breakage from cleanup
