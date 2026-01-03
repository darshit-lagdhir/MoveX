# MoveX API Reference

> Complete API documentation for MoveX backend

---

## Authentication

| Method | Endpoint | Description |
|--------|----------|-------------|
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account (supports `role`: user) |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Current user info |
| POST | `/api/auth/forgot-password-check` | Check recovery eligibility |
| POST | `/api/auth/reset-password-security` | Verify security questions |
| POST | `/api/auth/reset-password` | Reset password with token |
| GET | `/api/maintenance` | Check maintenance status |

---

## Dashboard

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/me` | User dashboard data |
| GET | `/api/dashboard/admin` | Admin access check |
| GET | `/api/dashboard/admin/stats` | System statistics |
| POST | `/api/dashboard/logout` | Logout and clear session |

---

## Shipments (Admin)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/admin/shipments` | List all shipments |
| POST | `/api/dashboard/admin/shipments/create` | Create new shipment |

---

## Profile

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/me` | Full profile data with organization |
| PUT | `/api/me` | Update profile (name, phone) |
| GET | `/api/organization/me` | User's organization details |
| GET | `/api/organization/users` | Organization users (admin/franchisee) |
| GET | `/api/organizations` | All organizations (admin only) |

---

## Health Check

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health status |
| GET | `/api/health/detailed` | Detailed health info (requires key) |
| GET | `/api/health/ready` | Readiness probe |
| GET | `/api/health/live` | Liveness probe |

---

## MFA (Multi-Factor Authentication)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/mfa/verify` | Verify MFA code |

---

## Request/Response Format

### Authentication Headers

```
Content-Type: application/json
Authorization: Bearer <jwt-token>  // For cross-origin requests
```

### Success Response

```json
{
    "success": true,
    "message": "Operation completed",
    "data": { ... }
}
```

### Error Response

```json
{
    "error": "Error type",
    "message": "Human readable message",
    "code": "ERROR_CODE"
}
```

---

## Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `NO_SESSION` | 401 | No valid session/token |
| `SESSION_EXPIRED` | 401 | Session has expired |
| `USER_NOT_FOUND` | 401 | User doesn't exist |
| `ACCOUNT_DISABLED` | 403 | Account is disabled |
| `ROLE_MISMATCH` | 403 | Insufficient permissions |
| `INVALID_SESSION` | 401 | Invalid session data |

---

## Rate Limits

| Endpoint | Limit | Window |
|----------|-------|--------|
| `/api/auth/login` | 5 attempts | 15 minutes |
| `/api/auth/register` | 3 attempts | 15 minutes |
| `/api/auth/forgot-password` | 3 attempts | 15 minutes |
| General API | 100 requests | 15 minutes |
