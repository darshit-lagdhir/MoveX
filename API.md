# MoveX API Guide (The "How to talk to MoveX" Guide)

Welcome to the full MoveX API guide! This document explains exactly how to send messages to the MoveX server and what the server will say back. It is written in simple English so that anyone can understand it, but it contains every detail needed to build a mobile app or a new website for MoveX.

---

## 📍 Essential Information

### Where is the Server?
*   **On your computer:** `http://localhost:4000`
*   **Online:** `https://your-render-app.onrender.com`
*   **Configuration:** The frontend uses `js/config.js` to know where the backend is. Edit that file to change the URL.

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

### 👤 Who am I? (Basic)
*   **Path:** `GET /api/auth/me`
*   **Details:** Returns basic session info (username, role).

### 👤 User Profile & Organization (Detailed)
*   **Path:** `GET /api/me`
*   **Details:** Returns full user profile `user` object and `organization` object.
*   **Organization Data:** Includes `id`, `name`, `type`, `status`, `address` (full address), and `pincodes`.

### ✏️ Update Profile
*   **Path:** `PUT /api/me`
*   **What to send:**
    ```json
    {
      "full_name": "New Name",
      "phone": "9876543210"
    }
    ```


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

### 📊 Reports Statistics (Filtered)
*   **Path:** `GET /api/dashboard/admin/reports/stats`
*   **Settings:**
    *   `startDate`: (Optional) Filter from this date (YYYY-MM-DD).
    *   `endDate`: (Optional) Filter to this date (YYYY-MM-DD).
    *   If missing, defaults to **Last 30 Days**.
*   **What you get:**
    *   `successRate`: Percentage of successful deliveries.
    *   `avgDeliveryTime`: Average days taken for delivery.
    *   `history`: Daily breakdown of Shipments, Completed, Issues, and Revenue.

### 💰 Finance Statistics
*   **Path:** `GET /api/dashboard/admin/finance/stats`
*   **What you get:**
    *   `totalRevenue`: Total all-time revenue (₹).
    *   `pendingRevenue`: Revenue from undelivered shipments.
    *   `payouts`: Pending payouts (currently 0).

###  Recent Transactions
*   **Path:** `GET /api/dashboard/admin/finance/transactions`
*   **What you get:** List of recent 10 transactions with sender and amount.

### 📦 Recent Parcels List
*   **Path:** `GET /api/dashboard/admin/shipments`
*   **Settings:** Add `?limit=10` for a short list or `?limit=all` for everything.
*   **What you get:** A list where each item has:
    *   `tracking_id`: The ID (e.g., MX00001).
    *   `sender_name`: Who sent it.
    *   `receiver_name`: Who is getting it.
    *   `status`: Its current stage (Pending, In Transit, etc.).

### ➕ Create a New Shipment (Parcel)
*   **Path:** `POST /api/dashboard/admin/shipments/create`
*   **Validation Rules:**
    *   **Names**: Letters and spaces only.
    *   **Mobile**: Exactly 10 digits (Numbers only).
    *   **Pincode**: Exactly 6 digits (Numbers only).
    *   **Price**: Valid number (amount).
*   **What to send:**
    ```json
    {
      "sender_name": "John Doe", "sender_phone": "9876543210", "sender_address": "Street 1", "sender_pincode": "560001", "sender_city": "Mumbai",
      "receiver_name": "Jane Smith", "receiver_phone": "9988776655", "receiver_address": "Street 2", "receiver_pincode": "560002", "receiver_city": "Delhi",
      "weight": 5.0, "amount": 250, "contents": "Books and Stationery"
    }
    ```
*   **Sequential IDs:** Tracking IDs are now created in series (e.g., `MX10001`, `MX10002`).

### 🔄 Update Parcel Status
*   **Path:** `POST /api/dashboard/admin/shipments/update-status`
*   **What to send:**
    ```json
    {
      "tracking_id": "MX00001",
      "status": "in_transit"
    }
    ```
*   **Allowed Statuses:** `pending`, `in_transit`, `reached at final delivery hub`, `delivered`, `not delivered`, `returned`.

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

### ✏️ Disable Franchise Branch
*   **Path:** `POST /api/dashboard/admin/franchises/status`
*   **What to send:** `{"id": 123, "status": "disabled"}`.
*   **Effect:** Disables the branch operations (tracking/booking).

---

## 🏢 4. Franchisee Operations

These paths are for Franchise Owners to manage their business.

### 📊 Franchise Stats
*   **Path:** `GET /api/dashboard/franchisee/stats`
*   **Details:** Returns shipments count, pending pickups, today's deliveries, and total revenue.

### 📦 Franchise Shipments
*   **Path:** `GET /api/dashboard/franchisee/shipments`
*   **Details:** List of all shipments created by or assigned to this franchise.

### ➕ Create Shipment (Franchisee)
*   **Path:** `POST /api/dashboard/franchisee/shipments/create`
*   **Validation:** Checks if sender and receiver pincodes are serviceable.
*   **What to send:**
    ```json
    {
      "sender_name": "John", "sender_phone": "...", "sender_pincode": "560001", "sender_address": "...",
      "receiver_name": "Jane", "receiver_phone": "...", "receiver_pincode": "560002", "receiver_address": "...",
      "weight": 2.5, "amount": 150
    }
    ```

### 🚚 Pickup Requests (Pincode Based)
*   **Path:** `GET /api/dashboard/franchisee/pickup-requests`
*   **Details:** Shows pending shipments in pincodes assigned to this franchise.

### ✅ Approve Pickup
*   **Path:** `POST /api/dashboard/franchisee/pickup-requests/approve`
*   **What to send:** `{"id": "MX001"}`
*   **Effect:** Assigns shipment to franchise and changes status to 'picked up'.

### ❌ Reject Pickup
*   **Path:** `POST /api/dashboard/franchisee/pickup-requests/reject`
*   **What to send:** `{"id": "MX001", "remarks": "reason"}`

### 👥 Franchise Staff Management
*   **Path:** `GET /api/dashboard/franchisee/staff`
*   **Create:** `POST /api/dashboard/franchisee/staff/create` (Requires `username`, `password`, `full_name`, `phone`)
*   **Update:** `POST /api/dashboard/franchisee/staff/update`
*   **Disable:** `POST /api/dashboard/franchisee/staff/status`

### 📋 Task Assignment
*   **Get Available Tasks:** `GET /api/dashboard/franchisee/assignments/available` (Only shows shipments with status `reached at final delivery hub`)
*   **Bulk Assign:** `POST /api/dashboard/franchisee/assign`
    ```json
    {
      "staff_id": 123,
      "shipment_ids": ["MX10001", "MX10002"]
    }
    ```

---

### 📋 List All Staff (Admin View)
*   **Path:** `GET /api/dashboard/admin/staff`
*   **Who can use it:** Only **Admins**.
*   **What you get:** A list of all staff members with their role, hub, and contact info.

### ➕ Register New Staff (Admin View)
*   **Path:** `POST /api/dashboard/admin/staff/create`
*   **What to send:** `full_name`, `username`, `password`, `phone`, and `organization_id` (Hub).

### ✏️ Update Staff Details
*   **Path:** `POST /api/dashboard/admin/staff/update`
*   **What to send:** `id` (Staff ID) and any fields you want to change (`full_name`, `phone`, etc.).

### 🛡️ Disable Staff Account
*   **Path:** `POST /api/dashboard/admin/staff/status`
*   **What to send:** `{"id": 123, "status": "disabled"}`.
*   **Effect:** Prevents the staff member from logging in immediately.

---

## 👥 5. Staff Operations (Ground Team)

These paths are for Staff members to manage their assigned deliveries.

### 📋 List Assigned Tasks
*   **Path:** `GET /api/dashboard/staff/shipments`
*   **Who can use it:** Logged-in **Staff** members.
*   **What you get:** A list of shipments assigned specifically to this staff member by their Franchisee.

### 🔄 Bulk Update Status
*   **Path:** `POST /api/dashboard/staff/shipments/bulk-update`
*   **What to send:**
    ```json
    {
      "shipment_ids": ["MX10001", "MX10002"],
      "status": "out_for_delivery"
    }
    ```
*   **Allowed Statuses:** `out_for_delivery`, `delivered`, `not_delivered`.

### 📉 Staff Stats
*   **Path:** `GET /api/dashboard/staff/stats`
*   **What you get:** Counts for 'Pending at Hub', 'Out for Delivery', and 'Delivered Today'.

---

## 6. Public Tools (No Login Needed)

### 🧐 Can you deliver here? (Service Check)
*   **Path:** `GET /api/dashboard/public/check-service/:query`
*   **Usage:** Replace `:query` with a Pincode (e.g., `560048`).
*   **What you get back:** `{"serviceable": true, "details": { ... }}` if we have a franchise covering that area.

---

## 7. System Health & Probes

| Path | What it tells the Developer |
|------|---------------------------|
| `GET /api/health` | "I am awake and working." |
| `GET /api/health/detailed` | "Database is OK, Memory use is X, Uptime is Y." |
| `GET /api/health/ready` | "I have finished starting up and I am ready for data." |
| `GET /api/health/live` | "I have not crashed." |

---

## 8. Understanding Errors

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
