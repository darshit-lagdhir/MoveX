# 📡 MoveX API Infrastructure Reference

> **Version:** 2.4.1  
> **Base URL:** `https://api.yourdomain.com/api`  
> **Protocol:** JSON over HTTP/1.1  
> **Auth Method:** Hybrid (Session Cookie + Bearer Token)

This document is the **definitive guide** to the MoveX Backend Interface. It details every endpoint, its logic, security constraints, and expected data formats.

---

## 🔐 1. Authentication & Session Core

The Auth module is the gateway to the system. It handles identity verification and session lifecycle management.

### **POST** `/auth/login`
Authenticates a user and establishes a secure server-side session.
*   **Access:** Public (Rate Limited: 5 req / 15 min).
*   **Request Body:**
    ```json
    {
      "username": "admin",
      "password": "securePassword123",
      "role": "admin" // Optional, used to hint login context
    }
    ```
*   **Backend Logic:**
    1.  Validates input format via `validation.js` regex.
    2.  Queries `users` table for `username` and `status='active'`.
    3.  Compares `password` hash using `bcrypt.compare()`.
    4.  **On Success:** Creates a record in `sessions` table. Sets `movex.sid` HttpOnly Cookie.
    5.  **On Failure:** Logs masked attempt via `authLogging.js` (e.g., `a***@domain.com`).
*   **Failure Scenarios:**
    *   `401`: Incorrect Password.
    *   `429`: Too many attempts (Account locked for 15m).
*   **Response:**
    ```json
    {
      "success": true,
      "token": "a1b2c3d4...", // Legacy JWT (for mobile apps)
      "user": { "id": 1, "username": "admin", "role": "admin" }
    }
    ```

### **POST** `/dashboard/logout`
Securely terminates the user's session.
*   **Access:** Authenticated.
*   **Backend Logic:**
    1.  Reads `movex.sid` cookie.
    2.  Deletes corresponding row from `sessions` table (Hard Logout).
    3.  Clears browser cookies using `res.clearCookie()`.
*   **Response:** `{ "success": true, "message": "Logged out" }`

### **GET** `/me`
Session Validity Check. Used by the Frontend (`dashboard-guard.js`) on every page load.
*   **Access:** Authenticated.
*   **Response:**
    ```json
    {
      "valid": true,
      "user": { ... },
      "organization": { "id": 5, "name": "Mumbai Hub" }
    }
    ```
    *   *Note:* If the session is expired, this returns `401 Unauthorized`.

---

## 🔐 2. MFA (Multi-Factor Authentication)

**Base Path:** `/api/mfa`
**State:** Currently Beta.

### **POST** `/setup`
Generates a QR Code for Google Authenticator.
*   **Logic:** Uses `speakeasy` to generate a TOTP secret. Saves it temporarily in `users.mfa_temp_secret`.
*   **Response:** `{ "secret": "JBSWY3DPEHPK3PXP", "qr_code": "data:image/png;base64..." }`

### **POST** `/verify`
Finalizes MFA setup or verifies login.
*   **Body:** `{ "token": "123456" }`
*   **Logic:** Verifies token against the stored secret. If valid, promotes `mfa_temp_secret` to `mfa_secret` and enables MFA for the user.

---

## 📊 3. Admin Dashboard Module

**Base Path:** `/api/dashboard/admin`
**Middleware:** `validateSession` + `requireRole('admin')`

### **GET** `/stats`
Fetches high-level KPIs for the Admin Dashboard cards.
*   **Returns:**
    ```json
    {
      "stats": {
        "totalShipments": 1250,
        "activeFranchises": 12,
        "totalRevenue": 450000.50,
        "failedDeliveries": 1.5, // Percentage
        "pendingShipments": 45
      }
    }
    ```
*   **Logic:** Aggregates data from `shipments` and `organizations` tables using `COUNT(*)` and `SUM()`.

### **GET** `/shipments`
The main analytics feed for the centralized tracking table.
*   **Query Params:**
    *   `limit`: Number of records (default 10). Pass `all` for export.
*   **Backend Logic:** Joins shipment data with calculated delivery estimates.
*   **Response:** An array of "Rich Shipment Objects" containing sender/receiver metadata.

### **POST** `/shipments/create`
Creates a new shipment in the system.
*   **Validation:** 
    *   `sender_pincode`: Must be exactly 6 digits.
    *   `sender_mobile`: Must match Indian mobile format (`+91...`).
*   **Logic:**
    1.  Locks the sequence generator.
    2.  Finds the last `tracking_id` (e.g., `MX00050`).
    3.  Increments to `MX00051`.
    4.  Inserts record into `shipments`.
*   **Payload:**
    ```json
    {
      "sender_name": "John Doe", "sender_mobile": "9876543210", 
      "sender_pincode": "400001", "weight": 2.5, "price": 150
      // ... receiver details ...
    }
    ```

### **GET** `/franchises`
Lists all Franchise Hubs and their Owners.
*   **Logic:** Performs a LEFT JOIN between `organizations` and `users` (where role='franchisee') to return a merged view.
*   **Response:**
    ```json
    [
      {
        "id": 10, "name": "Pune Hub", "pincodes": "411001, 411002",
        "owner_name": "Rahul S", "owner_phone": "..."
      }
    ]
    ```

### **POST** `/franchises/create`
**Transactional Endpoint.**
*   **Logic:** Uses a Database Transaction (`BEGIN...COMMIT`).
    1.  Creates the Organization entry.
    2.  Creates the User entry linked to that Org ID.
    3.  If either fails, the entire operation rolls back (`ROLLBACK`).
*   **Why:** Prevents "Orphaned Organizations" (Hubs without owners).

---

## 🌍 4. Public & Utility Services

**Base Path:** `/api/dashboard/public`

### **GET** `/check-service/:query`
The "Serviceability Checker" tool used on the Landing Page and Admin Panel.
*   **Params:** `query` (can be a Pincode like `400001` or a Name like `Mumbai`).
*   **Logic:**
    1.  Sanitizes the input.
    2.  Executes a complex SQL query using `ILIKE` for names and robust string matching for comma-separated pincode lists.
*   **Response:**
    ```json
    {
      "serviceable": true,
      "details": { "name": "Mumbai Central Hub", "address": "..." }
    }
    ```

---

## 🏥 5. System Health & Monitoring

**Defined in:** `backend/routes/health.js`

### **GET** `/health`
*   **Purpose:** Simple heartbeat for Load Balancers (AWS ALB / Cloudflare).
*   **Response:** `{ "status": "ok" }` (200 OK).

### **GET** `/health/detailed`
*   **Security:** Requires header `x-health-key` matching the server's `HEALTH_CHECK_KEY` env var.
*   **Checks:**
    1.  **DB Latency:** Runs `SELECT NOW()` and measures milliseconds.
    2.  **Memory:** Returns Heap Used vs Total.
    3.  **Uptime:** Server process uptime.
*   **Usage:** Used by SREs /DevOps for deep diagnostics.

---

## 🛡️ 6. Error Code Reference

The API uses standard HTTP Status Codes, but with specific application meanings.

| Code | Meaning (Non-Coding) | Meaning (Coding) | Action Required |
| :--- | :--- | :--- | :--- |
| **200** | Success | Request processed successfully. | None. |
| **400** | Bad Request | Validation failed (e.g., missing field). | Fix JSON payload. |
| **401** | Unauthorized | Session cookie missing or expired. | Redirect to Login. |
| **403** | Forbidden | Valid session, but wrong Role (e.g., Staff accessing Admin). | Show "Access Denied". |
| **404** | Not Found | Endpoint or Resource ID does not exist. | Check URL/ID. |
| **413** | Payload Too Large | Request body > 100KB. | Reduce data size. |
| **429** | Too Many Requests | Rate limit hit (DoS protection). | Wait 15 minutes. |
| **503** | Service Unavailable | Database is down or restarting. | Retry later. |

---

## 📦 7. Type Definitions

Common Data Structures used across the API.

### `Shipment` Object
```json
{
  "tracking_id": "MX00050",
  "status": "in_transit",
  "history": [
    { "status": "picked_up", "timestamp": "2024-01-01T10:00:00Z" }
  ]
}
```

### `User` Object
```json
{
  "id": 1,
  "username": "admin",
  "role": "admin", // ENUM('admin', 'franchisee', 'staff', 'user')
  "organization_id": null // Null for Admin, Set for Franchisee
}
```

---

<div align="center">
  <sub>MoveX API Reference - The Backbone of Logistics</sub>
</div>
