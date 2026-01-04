# 🤝 MoveX Developer's Handbook

> **Role:** Engineering Onboarding & Contribution Guide  
> **Philosophy:** "Security First, Performance Always"

Welcome to the MoveX engineering team! This document is your map, rulebook, and guide to navigating the codebase.

---

## 🗺️ 1. The Project Atlas (Project Structure)

Understanding where files live is half the battle. This project uses a monolithic structure with a clear separation of concerns.

### 📂 `backend/` (The Brain)
*   **`src/app.js`**: The monolithic entry point. Defines Middleware order (CORS -> Helmet -> Auth -> Routes).
    *   *Critical:* Contains the `protectStaticDashboards` logic that safeguards HTML files.
*   **`src/session.js`**: Our custom Session Store class. Handles DB interaction for auth tokens.
*   **`middleware/`**:
    *   `authLogging.js`: Masks PII (emails/IPs) before logging to Stdout.
    *   `rateLimiter.js`: Defines the "5 tries per 15 min" rule.
    *   `validation.js`: Regex checks for inputs.
*   **`routes/`**: API Controllers.
    *   `dashboard.js`: The "God Controller" for Admin features (Stats, Users, Franchises).
    *   `health.js`: Liveness probes for Kubernetes/Koyeb.
*   **`sql/`**: The history of our database schema. Numbered `001`, `002`... for sequential execution.

### 📂 `js/` (The Logic)
*   **`admin-layout.js`**: The **SPA Router**. Intercepts links and loads partials. It creates the "Single Page" feel.
*   **`admin-core.js`**: The **Business Logic**. Contains `window.MoveXAdmin` which drives Modals, Tables, and Forms.
*   **`dashboard-guard.js`**: The **Gatekeeper**. Runs on `index.html` load to verify cookies before rendering sensitive UI.
*   **`security/`**:
    *   `anti-tamper.js`: The "F12 Blocker". Detects inspection attempts.
    *   `device-binding.js`: Browser fingerprinter using Canvas/WebGL entropy.
    *   `vault-manager.js`: LocalStorage encryption wrapper using AES-GCM.

### 📂 `admin/` & `dashboards/` (The UI)
*   Raw HTML files (e.g., `users.html`, `shipments.html`). They do **NOT** contain `<head>` navigation scripts directly; those are injected by `admin-layout.js`.

---

## 🏗️ 2. The SPA Architecture (How it Works)

MoveX looks like a multi-page site, but acts like a Single Page App (SPA) to reduce server load and improve speed.

### The "Partial Injection" Flow
1.  **User Clicks Link:** `<a href="users.html">`
2.  **Interception:** `admin-layout.js` catches the click event.
3.  **Fetch:** `fetch('/admin/users.html')` is fired to the server.
4.  **Parse:** The HTML response is parsed. We throw away `<head>` and `<body>` tags.
5.  **Inject:** We extract the `<main>` tag content and insert it into the current DOM.
6.  **Initialize:** We look up `users` in the `initializers` object (in `admin-core.js`) and run the setup code.

### ⚠️ How to Add a New Page
1.  **Create File:** `admin/my-new-page.html`.
2.  **Add Logic:**
    Open `js/admin-core.js`. Find `const initializers = { ... }`.
    ```javascript
    'my-new-page': async function() {
        // Your setup code here
        // Example: Bind a button click
        document.getElementById('myBtn').onclick = () => {
             // Logic...
        };
    }
    ```
3.  **Permissions:**
    Open `js/dashboard-guard.js`. Add your page to `ROLE_HIERARCHY`.
    ```javascript
    'my-new-page': ['admin', 'manager']
    ```

---

## 📜 3. Coding Standards & Best Practices

### A. JavaScript (ES6+)
*   **No jQuery.** Use vanilla `document.querySelector`, `classList`, and `fetch`.
*   **Async/Await:** Always prefer `async/await` over callbacks/Promises.
*   **Module Pattern:** We use IIFE (Immediately Invoked Function Expressions) to avoid polluting the global scope.
    ```javascript
    // GOOD
    (function() {
      const privateVar = 1;
      window.PublicMethod = () => { ... };
    })();
    ```

### B. Security Rules (Review Modals)
1.  **SQL Injection:** NEVER concatenate strings in SQL.
    *   ❌ `db.query("SELECT * FROM users WHERE name = " + name)`
    *   ✅ `db.query("SELECT * FROM users WHERE name = $1", [name])`
2.  **XSS Protection:** Use `textContent` instead of `innerHTML` when displaying user input.
    *   ❌ `div.innerHTML = user.bio`
    *   ✅ `div.textContent = user.bio`
3.  **Secrets:** NEVER commit `.env` files. Use `process.env.VAR_NAME`.

### C. SQL & Database
*   **Migrations:** Always creating a new numbered file in `backend/sql/`.
*   **Transactions:** If you modify 2 tables (e.g., create Org + create User), you **MUST** use `BEGIN...COMMIT` blocks to ensure data consistency.

### D. CSS (Design System)
*   **Glassmorphism:** Use the `glass-panel` class for containers.
*   **Variables:** Always use CSS variables (`--brand-primary`, `--surface-dark`) defined in `index.css`. Never hardcode hex codes.

---

## 🧪 4. Testing & Validation

### Serviceability Tool
To test the Pincode checker:
1.  Go to **Admin > Serviceability**.
2.  Type `400001` (Should conform to 6-digit regex).
3.  Type `Mumbai` (Should trigger `ILIKE` search).
4.  Verify the result matches the `organizations` table.

### Security Testing
1.  **Anti-Tamper:** Open DevTools on `localhost`. It should work / show a warning. Deploy to Production. Open DevTools. It should **LOCK DOWN** (Red Screen).
2.  **Session Kill:** Login as User. Login as Admin in another browser. As Admin, disable the User. The User should be logged out instantly on their next click.
3.  **Role Access:** Login as 'Staff'. Try to access `/admin/dashboard.html`. You should be redirected or blocked.

### Git Workflow
1.  **Branching:** Create a feature branch `feat/my-feature` from `main`.
2.  **Commits:** Use conventional commits: `feat: add new modal` or `fix: resolve login bug`.

---

<div align="center">
  <sub>MoveX Engineering - Build Fast, Build Safe</sub>
</div>
