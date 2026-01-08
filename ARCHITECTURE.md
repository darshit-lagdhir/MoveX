# MoveX Architecture Guide (How MoveX is Built)

This guide takes a deep look into the "Engine Room" of MoveX. It is written for anyone who wants to understand how the code is organized, how the security works, and how data moves through the system.

---

## 1. The Core Design: A "Security-First Monolith"

MoveX is built as a **Monolith**. This means the Frontend and the Backend live together in one project.

### Why a Monolith?
*   **Speed:** No need to jump between different servers to find code.
*   **Safety:** The Backend can directly protect the Frontend files.
*   **Simple Setup:** You only need one `.env` file and one command to start the whole app.

### The "Iron Fortress" Philosophy
We built MoveX with the idea that the **Server is the Master**. The browser (Frontend) can never be trusted. Every single click you make is checked by the server before any data is shown or saved.

---

## 2. The Three Pillars of MoveX

### Pillar 1: The Modern Frontend (HTML, CSS, JS)
We don't use heavy tools like "React" or "Angular." instead, we use a custom **Hybrid SPA** design.
*   **admin-layout.js**: This is the "Brain" of the Admin pages. It has a **Shadow Router** that:
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

### 2. Opaque Session Keys
Instead of using JWT tokens (which can be hard to take back), we use **Opaque Keys**.
*   We give the user a random ID like `5f9d...`.
*   We save that ID in our database along with the user's name.
*   If we want to log someone out, we just delete that ID from our database. Their browser instantly loses access.

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

---

## 8. How we manage Photos

Photos of parcels are big and slow. We don't save them in our server.
*   We use **Supabase Storage**.
*   The photo is saved in a folder named after the Parcel ID.
*   We only save the **Link** to the photo in our database.
*   For extra safety, these links expire after 1 hour. This means even if someone steals a photo link, it will stop working very quickly.

---

## 9. Scaling (Handling More Users)

Even though MoveX is a Monolith, it can handle many users.
*   **Connection Pooling (Port 6543)**: We use a tool that allows 1000s of data requests to share the same few connections to the database.
*   **PM2**: We use a process manager that restarts the server instantly if it ever crashes.
*   **Caching**: We tell the browser to "remember" the CSS and Images for 1 year, so they only have to be downloaded once.

---

**Summary:** MoveX Architecture is built to be **Simple to learn but Hard to break**. Every design choice was made to prioritize the safety of your logistics data.
