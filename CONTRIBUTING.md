# 🤝 MoveX Developer Handbook

> **Philosophy:** "Security First • Performance Always"
> **Stack:** Vanilla JS (SPA) • Node.js • PostgreSQL

---

## 🗺️ 1. Project Map

**Where does everything live?**

```text
/
├── admin/              # HTML Pages (UI)
│   └── users.html      # (No <head>, injected by router)
├── backend/            # The Core Monolith
│   ├── src/app.js      # App Entry (Middleware)
│   ├── routes/         # API Controllers
│   └── sql/            # Migrations (Source of Truth)
├── js/                 # Client Logic
│   ├── admin-layout.js # The SPA Router
│   ├── admin-core.js   # The Business Logic
│   └── security/       # Anti-Tamper Modules
└── css/                # Global Styles
```

---

## 🏗️ 2. SPA Architecture

We use a custom **"Partial Injection"** router to mimic React without the bloat.

**The Flow:**
1.  **Click:** User clicks `<a href="users.html">`.
2.  **Intercept:** `admin-layout.js` stops the reload.
3.  **Fetch:** Loads `users.html` via AJAX.
4.  **Inject:** Replaces `<main>` content only.
5.  **Init:** Runs logic from `admin-core.js`.

### ⚡ How to Add a Page
1.  **Create File:** `admin/my-page.html`.
2.  **Add Logic (`js/admin-core.js`):**
    ```javascript
    'my-page': async function() {
        // Init code here
    }
    ```
3.  **Set Permission (`js/dashboard-guard.js`):**
    ```javascript
    'my-page': ['admin', 'manager']
    ```

---

## 📜 3. Coding Standards

### 🟡 JavaScript
*   **No jQuery.** Use `document.querySelector`.
*   **Async/Await:** Preferred over Promises.
*   **Module Pattern:** Use IIFE to protect scope.
    ```javascript
    (function() {
      // Private Code
    })();
    ```

### 🔴 Security (Crucial)
*   **SQL:** NEVER concatenate strings.
    *   ✅ `db.query('SELECT * FROM users WHERE id=$1', [id])`
*   **XSS:** Use `textContent`, never `innerHTML`.
*   **Secrets:** Use `process.env`. Never commit `.env`.

### 🔵 Styles
*   **Design:** Glassmorphism.
*   **Vars:** Use `--brand-primary`, never hex codes.

---

## 🧪 4. Testing Workflow

**1. Serviceability Check**
*   Go to **Admin > Serviceability**.
*   Type `Mumbai` → Should trigger SQL `ILIKE`.

**2. Security Check**
*   Open DevTools (`F12`).
*   Verify **"System Lockdown"** screen appears.

**3. Session Kill**
*   Login as User on Phone.
*   Disable User from Admin Panel.
*   Verify Phone logs out instantly.

---

## 🔄 Git Workflow
1.  **Branch:** `feat/new-modal` (from `main`).
2.  **Commit:** `feat: added date picker`.
3.  **PR:** Review, then Squash & Merge.

---

<div align="center">
  <sub>MoveX Engineering • Documented & Disciplined</sub>
</div>
