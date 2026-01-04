# 📡 MoveX API Infrastructure & Documentation

This document is the "Source of Truth" for how the MoveX application communicates. Whether you are a developer building a mobile app for MoveX or a staff member trying to understand system limits, this guide covers it all.

---

## 🏗️ API Fundamentals
- **Base URL**: `https://your-api-domain.com/api` (or `http://localhost:4000/api` for local)
- **Data Format**: `application/json` (Everything you send and receive is JSON).
- **Security**: Most endpoints require a **Session Cookie** (`movex_sid`) or a **JWT Token** in the `Authorization` header.

---

## 🔐 Authentication & Identity logic

### `POST /auth/login`
**What it does**: Takes your username and password, verifies them against the database, and creates a "Session."
- **Payload**:
  ```json
  { "username": "admin_one", "password": "securepassword" }
  ```
- **Coding Sense**: On success, the server sends back a `Set-Cookie` header. This cookie is "HttpOnly," meaning hackers cannot see it in the browser's console. It also returns a `token` for manual use.

### `POST /auth/register`
**What it does**: Allows a guest to create a public "User" account.
- **Restriction**: You can only register as a standard `user` here. `staff` and `franchisee` roles are blocked for safety.

### `POST /auth/logout`
**What it does**: Instantly kills your session. 
- **Coding Logic**: It deletes the record from the `sessions` table in the database. This ensures that even if someone stole your cookie, it would be useless after logout.

---

## 🛠️ Administrative Control (The "Super-User" APIs)

### `GET /dashboard/admin/stats`
**Functional Meaning**: This powers the "KPI Cards" at the top of the Admin screen.
- **Returns**: Total shipments, active franchises, total revenue, and pending tasks.

### `GET /dashboard/admin/users`
**What it does**: Fetches a list of all accounts. Provides data for the User Orchestration table.

### `POST /dashboard/admin/users/status`
**What it does**: Allows an Admin to "Disable" a user account.
- **Coding Logic**: When an account is disabled, the server forces the user to be logged out immediately on all their devices by clearing their session from the database.

---

## 🏢 Franchise & Hub Management

### `GET /dashboard/admin/franchises`
**What it does**: Fetches all delivery hubs (Organizations). 

### `POST /dashboard/admin/franchises/create`
**Functionality**: This is a "Combo API". It creates both a new **Organization** (The Hub) and a new **Franchisee User** (The Owner) in one transaction. If one fails, both are cancelled.

### `POST /dashboard/admin/franchises/update`
**What it does**: Updates office address, assigned pincodes, and owner contact details.

### `POST /dashboard/admin/franchises/status`
**Possible Statuses**: `active`, `pending`, `disabled`.

---

## 📦 Shipment & Public APIs

### `GET /api/dashboard/public/check-service/:query`
**Public Utility**: Anyone can call this. You don't need to be logged in.
- **Query**: Can be a city name (e.g. "Mumbai") or a 6-digit Pincode.
- **Logic**: It looks for an active match in the `organizations.pincodes` field.

### `POST /dashboard/admin/shipments/create`
**What it does**: Books a new courier into the system. It generates a tracking row in the timeline starting with the status `Pending`.

---

## 🚥 Standard Response codes

| Code | Meaning (Non-Coding) | Meaning (Coding) |
| :--- | :--- | :--- |
| **200** | Success! | Request processed okay. |
| **401** | Not Logged In | Session is missing or expired. |
| **403** | No Permission | You are logged in, but you don't have the right Role. |
| **404** | Not Found | The data doesn't exist. |
| **500** | Server Error | Something went wrong in the code. |

---

<div align="center">
  <sub>MoveX API Documentation System - Internal Use Only</sub>
</div>
