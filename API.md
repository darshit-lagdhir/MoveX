# 📡 MoveX API Reference

> **Version:** 2.4.1
> **Protocol:** JSON over HTTP/1.1
> **Auth:** Session Cookies + Bearer Token (Hybrid)

---

## 🔐 1. Authentication

**Base Path:** `/api/auth`

### 🟡 `POST /login`
Creates a secure session.

*   **Rate Limit:** 5 requests / 15 mins.
*   **Payload:**
    ```json
    { "username": "admin", "password": "*****" }
    ```
*   **Logic:**
    1.  Validate Credentials.
    2.  Sign `movex.sid` cookie.
    3.  Log attempt (Masked IP).

### 🟡 `POST /logout`
Destroys session on Server & Client.

*   **Action:** Deletes DB row + Clears Cookie.

### 🟢 `GET /me`
**Session Check.** Called on every page load.
*   **Returns:** `{ "valid": true, "user": {...} }`
*   **Error:** `401 Unauthorized` (if session expired).

---

## 🔐 2. MFA (Multi-Factor Auth)
*(Status: Beta)*

*   **`POST /setup`**: Returns QR Code + Secret.
*   **`POST /verify`**: Validates TOTP (`123456`) and enables MFA.

---

## 📊 3. Admin Dashboard
**Path:** `/api/dashboard/admin`
**Guard:** `requireRole('admin')`

### 🟢 `GET /stats`
*   **Usage:** Populates KPI Cards.
*   **Data:** `totalShipments`, `totalRevenue`, `activeFranchises`.

### 🟢 `GET /shipments`
*   **Params:** `?limit=10` or `?limit=all`.
*   **Returns:** Array of Shipment Objects (Rich Data).

### 🟡 `POST /shipments/create`
*   **Logic:**
    1.  Lock Sequence.
    2.  Generate `MX00051`.
    3.  Save to DB.
*   **Validation:** Pincode must be 6 digits.

### 🟡 `POST /franchises/create`
**Transactional (Atomic Operation)**
1.  `BEGIN` Transaction.
2.  Create **Organization**.
3.  Create **User** (Owner).
4.  `COMMIT` (or `ROLLBACK` on error).

---

## 🌍 4. Public Utilities

### 🟢 `GET /check-service/:query`
**Serviceability Checker**
*   **Input:** Pincode (`400001`) OR Name (`Mumbai`).
*   **Method:** SQL `ILIKE` for partial matches.
*   **Returns:** `{ "serviceable": true, "details": {...} }`

---

## 🏥 5. System Health

*   **`GET /health`**: Simple Ping (`200 OK`).
*   **`GET /health/detailed`**: Deep Diagnostic.
    *   **Requires:** `x-health-key` header.
    *   **Checks:** DB Latency, Memory Usage, Uptime.

---

## 🛡️ 6. Error Reference

| Status | Meaning | Action |
| :--- | :--- | :--- |
| **200** | ✅ Success | Proceed. |
| **400** | ❌ Bad Input | Check JSON fields. |
| **401** | 🚫 Unauthorized | Log in again. |
| **403** | 🔒 Forbidden | Role mismatch. |
| **404** | ❓ Not Found | Check URL/ID. |
| **429** | ⏳ Rate Limit | Wait 15 mins. |
| **503** | ⚠️ Offline | DB is restarting. |

---

## 📦 7. Data Types

### **Shipment Object**
```json
{
  "tracking_id": "MX00001",
  "status": "in_transit",
  "sender_pincode": "400001"
}
```

### **User Object**
```json
{
  "username": "admin",
  "role": "admin",
  "organization_id": null
}
```

---

<div align="center">
  <sub>MoveX API • Clean • Typed • Secure</sub>
</div>
