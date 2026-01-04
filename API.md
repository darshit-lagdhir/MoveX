# 📡 MoveX API Infrastructure Reference

> **Version:** 2.1.0  
> **Base URL:** `https://presidential-fly-movex-237428a4.koyeb.app/api`  
> **Content-Type:** `application/json`

---

## 🔐 Authentication & Identity

Endpoints for user lifecycle and session management.

### `POST /auth/register`
Creates a new standard user account.
- **Access:** Public
- **Payload:**
  ```json
  {
    "username": "johndoe",
    "password": "securepassword123",
    "full_name": "John Doe",
    "phone": "+919876543210",
    "role": "user",
    "securityAnswers": { "q1": "val", "q2": "val", "q3": "val" }
  }
  ```
- **Constraint:** Only `user` role allowed for self-registration.

### `POST /auth/login`
Authenticates user and established a session.
- **Access:** Public
- **Payload:**
  ```json
  {
    "username": "johndoe",
    "password": "password",
    "role": "admin"
  }
  ```
- **Response:** Sets `movex.sid` HttpOnly cookie and returns Bearer JWT.

### `POST /auth/logout`
Destroys the current server-side session and clears client cookies.
- **Access:** Authenticated

### `POST /auth/forgot-password-check`
Checks if a user is eligible for self-service password recovery.
- **Logic:** Blocked for `admin`, `staff`, and `franchisee` roles (security policy).

---

## 🛠️ Administrative Control (Admin Only)

These endpoints require an active session with the `admin` role.

### `GET /dashboard/admin/stats`
Returns global system KPIs.
- **Sample Response:**
  ```json
  {
    "success": true,
    "stats": {
      "totalShipments": 1540,
      "activeFranchises": 12,
      "totalRevenue": 450000,
      "pendingShipments": 85
    }
  }
  ```

### `GET /dashboard/admin/users`
Returns a list of all users in the system.

### `POST /dashboard/admin/users/create`
Admin-created users (can specify any role).
- **Payload:** Same as register + `role` (admin|franchisee|staff|user)

### `POST /dashboard/admin/users/status`
Enable or disable a user account.
- **Effect:** Disabling an account immediately kills all associated active sessions.

---

## 📦 Shipment Orchestration

### `GET /dashboard/admin/shipments`
Fetch shipments with optional pagination and filtering.
- **Query Params:** `limit`, `status`, `query` (search by tracking ID/sender).

### `POST /dashboard/admin/shipments/create`
Generates a new shipment with a sequential tracking ID.
- **Validation:** Pincodes 6-digits, Mobile 10-digits, Name alpha-only.

### `POST /dashboard/admin/shipments/update-status`
Transition a shipment to a new state.
- **Allowed States:** `pending`, `in_transit`, `delivered`, `failed`, `returned`.

---

## 👤 User Profile & Organizations

### `GET /me`
Returns detailed identity data for the current logged-in user.
- **Includes:** Role-specific dashboard path, organization data, and MFA status.

### `PUT /me`
Allows users to update their personal details (`full_name`, `phone`).

### `GET /organization/users`
Returns colleagues within the same organization branch.
- **Access:** `admin` or `franchisee`.

---

## 🚦 System Health & Ops

### `GET /maintenance`
Returns the current maintenance mode state.
- **Logic:** If `true`, the middleware redirects all non-admin traffic.

### `GET /health`
Standard uptime and connection health check.
- **Detailed Check:** `/api/health/detailed?key=SECRET_KEY`

---

## ⚠️ Error Handling & Status Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `200` | OK | Success |
| `201` | Created | Resource created successfully |
| `400` | Bad Request | Validation error or invalid payload |
| `401` | Unauthorized | Session missing or expired |
| `403` | Forbidden | Insufficient permissions (RBAC) |
| `404` | Not Found | Resource does not exist |
| `429` | Too Many Requests | Rate limit exceeded |
| `500` | Internal Server Error | Unexpected server-side failure |

### Error Payload Format:
```json
{
  "success": false,
  "error": "Error Type",
  "message": "Descriptive error message for the UI",
  "code": "SPECIFIC_ERROR_CODE"
}
```

---

## 🛡️ Rate Limiting Policy

- **Auth Login:** 5 attempts / 15 mins (IP bound)
- **Auth Register:** 3 attempts / 1 hour
- **General API:** 100 requests / 15 mins / session

---

<div align="center">
  <sub>MoveX API Documentation System - Internal Use Only</sub>
</div>
