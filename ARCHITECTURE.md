# MoveX Architecture Guide (How MoveX is Built)

This guide takes a deep look into the "Engine Room" of MoveX. It is written for anyone who wants to understand how the code is organized, how the security works, and how data moves through the system.

---

## 1. The Core Design: A "Split-Stack" Architecture

MoveX uses a modern **Split Architecture**. This means the Frontend and Backend are hosted separately for better speed and scalability.

### Why Split?
*   **Speed:** The Frontend (Cloudflare) is on the Edge, loading instantly worldwide.
*   **Scalability:** The Backend (Render) only handles data, not serving HTML files.
*   **Flexibility:** You can update the frontend text/images without restarting the backend server.

### The "Iron Fortress" Philosophy
We built MoveX with the idea that the **Server is the Master**. The browser (Frontend) can never be trusted. Every single click you make is checked by the server before any data is shown or saved.



---

## 2. The Three Pillars of MoveX

### Pillar 1: The Modern Frontend (HTML, CSS, JS)
We don't use heavy tools like "React" or "Angular." instead, we use a custom **Hybrid SPA** design.
*   **dashboard-layout.js**: This is the "Brain" of the Admin pages. It has a **Shadow Router** that:
    1. Catches every time you click a sidebar link.
    2. Stops the browser from refreshing the page.
    3. Fetches the new content in the background.
    4. Swaps the middle part of the screen so fast you don't even see it.
*   **Zero-Build**: Because we don't use a "build" step, the code you see is exactly what the user sees. No hidden code, no secrets.

### Pillar 2: The Guarded Backend (Node.js & Express)
The backend is the "Security Guard" of the app.
*   **App.js**: This is the main entry point. It sets up the **Environment**, the **Health Monitor**, and handles **Role-Based Auto-Redirect** (sending logged-in users directly to their dashboard).
*   **Middleware Stack**: Every request goes through a "Stack" of checks:
    - **CORS Check**: Only allows your own website to talk to the server.
    - **Session Check**: Checks if your "sid" (Session ID) is valid in our database.
    - **Role Check**: Makes sure a "Staff" member isn't trying to do "Admin" work.
    - **Rate Limit**: Stops users from clicking buttons 100 times a second.

### Pillar 3: Professional Memory (PostgreSQL via Supabase)
We chose PostgreSQL because it is the "Gold Standard" for safe data.
*   **ACID Compliance**: This is a fancy way of saying: "If the power goes out while saving a parcel, the data will not be corrupted."
*   **Row Level Security (RLS)**: We tell the database itself: "Only an Admin can see the profit numbers." Even if a hacker finds a bug in our code, the database will still block them.

### Database Schema Design
MoveX uses table-specific column names for clarity:

| Table | Primary Key | Key Columns |
|-------|-------------|-------------|
| **organizations** | organization_id | name, type, status |
| **users** | username | user_id, role, status |
| **sessions** | session_id | token, username, expires_at |
| **password_resets** | reset_id | username, token_hash |
| **shipments** | tracking_id | shipment_id, creator_username, organization_id |
| **serviceable_cities** | city_id | name |

**Visual Reference:** See `ERDIAGRAM/index.html` for Chen Notation ER Diagram.

---

## 4. Core Functional Modules

| # | Module | Description |
|---|--------|-------------|
| 1 | **User Management** | Registration, login, roles, and session handling |
| 2 | **Franchise and Staff Operations** | Franchise management and staff assignments |
| 3 | **Customer Booking and Pricing** | Online booking and rate calculation |
| 4 | **Pickup and Dispatch Management** | Scheduling pickups and assigning deliveries |
| 5 | **Shipment Tracking and Delivery** | Real-time tracking and proof of delivery |
| 6 | **Reports and Analytics** | Dashboard metrics and business reports |

---

## 5. The Security Stack (Detailed)

How does MoveX stop hackers?

### 1. Scrambled Passwords (Bcrypt)
If someone breaks into your database, they will find long, random strings of text instead of passwords. It would take a supercomputer millions of years to figure out one password.

### 2. Hybrid Session Architecture
We use a **Hybrid** approach to handle logins across different domains:
*   **Primary (HttpOnly Cookie):** The browser saves a secure, opaque session ID (`movex.sid`). This is the safest way to log in.
*   **Secondary (JWT Fallback):** For cross-origin situations (like redirection), we generate a signed JWT containing the session ID. This ensures functionality even when third-party cookies are blocked.
*   **Centralized Control:** We can revoke any session from the database, instantly locking the user out, regardless of the method used.

### 3. Header Defense
In `app.js`, we set special instructions for the browser:
*   **X-Frame-Options: DENY**: Stops people from putting MoveX inside a "fake" website to steal clicks.
*   **CSP (Content Security Policy)**: Only allows scripts from MoveX to run. It blocks "Malware" scripts from the internet.

---

## 6. How the Folders are Organized

```
movex/
├── _headers                # Cloudflare/Nginx security settings
├── admin/                  # REAL HTML files (Protected by Backend)
├── backend/
│   ├── routes/             # All URL paths (Dashboard, Profile, Login)
│   ├── src/
│   │   ├── app.js          # The HEART of the server
│   │   ├── session.js      # The LOGIC for logins
│   │   ├── config/         # Database connection info
│   │   └── controllers/    # Calculations and business rules
│   └── sql/                # THE BLUEPRINTS (Table structures)
├── js/                     # Frontend scripts (How the UI works)
│   ├── config.js           # Public Frontend Settings (API URL)
└── styles/                 # Designing the premium look (CSS)
```

---

## 7. The Path of Data (Step-by-Step)

Imagine you are an Admin changing a Parcel status:

1.  **Frontend**: You click "Deliver." The `shipments.js` script sends a `POST` message to `/api/dashboard/admin/shipments/update-status`.
2.  **App.js**: The server sees the message.
3.  **CORS**: It checks if the message came from `localhost:4000` or your real site.
4.  **Session Middleware**: It looks at your browser cookies. It finds your `movex.sid` and checks if it is alive in the database.
5.  **Role Middleware**: It checks if you are an `admin`.
6.  **Controller**: The business logic checks if "Deliver" is a valid status.
7.  **Database**: It sends a command: `UPDATE shipments SET status = 'delivered' WHERE tracking_id = 'MX001'`.
8.  **Response**: The server sends a `{"success": true}` message back.
9.  **Frontend**: The UI sees the success and changes the color of the status badge to Green.

**Note:** The shipments table uses `tracking_id` as its PRIMARY KEY (not `shipment_id`).

---

## 8. How we manage Photos

Photos of parcels are big and slow. We don't save them in our server.
*   We use **Supabase Storage**.
*   The photo is saved in a folder named after the Parcel ID.
*   We only save the **Link** to the photo in our database.
*   For extra safety, these links expire after 1 hour. This means even if someone steals a photo link, it will stop working very quickly.

---

## 9. Scaling (Handling More Users)

## 9. Scaling (Handling More Users)

MoveX is designed to scale horizontally.
*   **Connection Pooling (Supabase Transaction Mode)**: We connect via **Port 6543**. This allows thousands of users to share a few active database connections. It also provides an **IPv4** address, which is required for Render deployments.
*   **PM2 (Backend)**: Restarts the server instantly if it crashes.
*   **Edge Caching (Frontend)**: Cloudflare handles all the static files (images, CSS), so your backend only focuses on API data.

---

**Summary:** MoveX Architecture is built to be **Simple to learn but Hard to break**. Every design choice was made to prioritize the safety of your logistics data.

---

## 10. Documentation Reference

| Document | Description |
|----------|-------------|
| `ERDIAGRAM/index.html` | Visual ER Diagram (Chen Notation) |
| `backend/sql/001_schema.sql` | SQL schema definitions |
| `API.md` | REST API documentation |
| `SETUP.md` | Deployment guide |
