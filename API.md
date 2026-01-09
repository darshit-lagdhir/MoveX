# MoveX API Guide (The "How to talk to MoveX" Guide)

Welcome to the full MoveX API guide! This document explains exactly how to send messages to the MoveX server and what the server will say back. It is written in simple English so that anyone can understand it, but it contains every detail needed to build a mobile app or a new website for MoveX.

---

## 📍 Essential Information

### Where is the Server?
*   **On your computer:** `http://localhost:4000`
*   **Online:** Your real website link (e.g., `https://your-movex-site.com`).

### Using JSON
All data sent to the server must be in **JSON** format. You must set this header in your requests:
`Content-Type: application/json`

### Authentication (Staying Logged In)
MoveX uses two ways to know who you are:
1.  **Cookies (Primary):** The browser automatically saves a "session cookie" called `movex.sid`.
2.  **Bearer Tokens (Backup):** You can send a `Bearer [TOKEN]` in the `Authorization` header if cookies don't work (useful for mobile apps).

---

## 🔑 1. Login & Management (Authentication)

### 📝 Create a New Account (Register)
*   **Path:** `POST /api/auth/register`
*   **Details:** Anyone can use this to create a basic "User" account.
*   **What to send:**
    ```json
    {
      "username": "new_user",
      "password": "strong_password123",
      "full_name": "John Doe",
      "phone": "9876543210"
    }
    ```
*   **Common Errors:**
    *   `400`: "Username already exists."
    *   `400`: "Password must be 8+ characters."

### 🔓 Login
*   **Path:** `POST /api/auth/login`
*   **Details:** This checks your password and gives you a session.
*   **What to send:**
    ```json
    {
      "username": "your_username",
      "password": "your_password"
    }
    ```
*   **Response:** `{"success": true, "message": "Login successful"}` plus a cookie.

### 🚪 Logout
*   **Path:** `POST /api/auth/logout` (or `POST /api/dashboard/logout`)
*   **Details:** This tells the server to forget your current session. After this, you must login again to see any private data.

### 👤 Who am I?
*   **Path:** `GET /api/auth/me`
*   **Details:** Tells you everything about your own account. Great for showing the user's name on the screen.

---

## 📊 2. Dashboard & Admin Tasks

These paths are used by the Admin to manage the whole business.

### 📈 Admin Statistics (The Big Numbers)
*   **Path:** `GET /api/dashboard/admin/stats`
*   **Who can use it:** Only **Admins**.
*   **What you get:**
    *   `totalShipments`: How many parcels are in the system.
    *   `activeFranchises`: How many branches are working.
    *   `totalRevenue`: Total money earned (₹).
    *   `failedDeliveries`: Percentage of failures.
    *   `shipmentsToday`: How many new parcels came today.

### 📦 Recent Parcels List
*   **Path:** `GET /api/dashboard/admin/shipments`
*   **Settings:** Add `?limit=10` for a short list or `?limit=all` for everything.
*   **What you get:** A list where each item has:
    *   `tracking_id`: The ID (e.g., MX00001).
    *   `sender_name`: Who sent it.
    *   `receiver_name`: Who is getting it.
    *   `status`: Its current stage (Pending, In Transit, etc.).

### ➕ Create a New Shipment (Parcel)
*   **Path:** `POST /admin/shipments/create`
*   **Validation Rules:**
    *   **Names**: Only letters.
    *   **Mobile**: Only numbers and `+`.
    *   **Pincode**: Exactly 6 digits.
    *   **Price**: Must be a valid number.
*   **What to send:** All fields for sender and receiver (Name, Mobile, Address, Pincode), plus `origin`, `destination`, `price`, and `weight`.

### 🔄 Update Parcel Status
*   **Path:** `POST /api/dashboard/admin/shipments/update-status`
*   **What to send:**
    ```json
    {
      "tracking_id": "MX00001",
      "status": "in_transit"
    }
    ```
*   **Allowed Statuses:** `pending`, `in_transit`, `delivered`, `failed`, `returned`.

---

## 👤 3. User & Franchisee Management

### � List All Users
*   **Path:** `GET /api/dashboard/admin/users`
*   **What you get:** A list of every staff member, owner, and user in the system.

### 🛡️ Change User Status
*   **Path:** `POST /api/dashboard/admin/users/status`
*   **What to send:** `{"username": "user123", "status": "disabled"}`.
*   **Effect:** If you disable a user, they are kicked out of the app immediately.

### 🏪 List All Franchises
*   **Path:** `GET /api/dashboard/admin/franchises`
*   **What you get back:** A list of all branches, their owners, and their coverage areas.

### 🏗️ Create a New Franchise
*   **Path:** `POST /api/dashboard/admin/franchises/create`
*   **Details:** This creates **two things at once**: a new Branch (Organization) and a new Owner (User).
*   **What to send:** Branch name, Address, Pincodes covered, and Owner's personal details.

### ✏️ Update Franchise Details
*   **Path:** `POST /api/dashboard/admin/franchises/update`
*   **What to send:** `id` and updated fields (e.g. `name`, `pincodes`, `performance`).

### 🛡️ Disable Franchise Branch
*   **Path:** `POST /api/dashboard/admin/franchises/status`
*   **What to send:** `{"id": 123, "status": "disabled"}`.
*   **Effect:** Disables the branch operations (tracking/booking).

---

## 👥 4. Staff Management (Logistics Team)

These paths are for managing the ground team (Drivers, Warehouse Staff, etc.).

### 📋 List All Staff
*   **Path:** `GET /api/dashboard/admin/staff`
*   **Who can use it:** Only **Admins**.
*   **What you get:** A list of all staff members with their role, hub, and contact info.

### ➕ Register New Staff
*   **Path:** `POST /api/dashboard/admin/staff/create`
*   **What to send:** `full_name`, `username`, `password`, `staff_role` (e.g., Driver, Warehouse Staff), `phone`, and `organization_id` (Hub).

### ✏️ Update Staff Details
*   **Path:** `POST /api/dashboard/admin/staff/update`
*   **What to send:** `id` (Staff ID) and any fields you want to change (`full_name`, `staff_role`, etc.).

### 🛡️ Disable Staff Account
*   **Path:** `POST /api/dashboard/admin/staff/status`
*   **What to send:** `{"id": 123, "status": "disabled"}`.
*   **Effect:** Prevents the staff member from logging in immediately.

---

## � 4. Public Tools (No Login Needed)

### 🧐 Can you deliver here? (Service Check)
*   **Path:** `GET /api/dashboard/public/check-service/:query`
*   **Usage:** Replace `:query` with a Pincode (e.g., `400001`) or a City Name.
*   **What you get back:** `{"serviceable": true, "details": { ... }}` if we can deliver there.

### 🏙️ List of Cities
*   **Path:** `GET /api/dashboard/public/serviceable-cities`
*   **Usage:** Shows up to 50 cities where we work. You can add `?search=Mum` to find "Mumbai."

---

## 🏥 5. System Health & Probes

| Path | What it tells the Developer |
|------|---------------------------|
| `GET /api/health` | "I am awake and working." |
| `GET /api/health/detailed` | "Database is OK, Memory use is X, Uptime is Y." |
| `GET /api/health/ready` | "I have finished starting up and I am ready for data." |
| `GET /api/health/live` | "I have not crashed." |

---

## ⚠️ 6. Understanding Errors

| Code | Simple Meaning | What you should do |
|------|----------------|-------------------|
| **400** | Wrong Data | Fix the spelling or fill in the missing boxes. |
| **401** | Not Logged In | Send the user back to the login page. |
| **403** | No Permission | Tell the user "You are not an Admin." |
| **404** | Not Found | The parcel ID or user does not exist. |
| **500** | Server Broke | Wait a minute and try again, or check the logs. |

---

**Summary for Developers:**
Always expect a `success: true` or `success: false` field in every response. If `success` is false, there will usually be an `error` field explaining what went wrong.
