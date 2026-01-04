# 🛠️ How to Contribute to MoveX

Thank you for being part of the MoveX journey! This guide explains how to write code and submit changes that match our quality standards.

---

## 🛤️ The Contribution Workflow

We use the **Feature Branching** model. This keeps the "Main" code clean and safe.

1. **Fork & Branch**: Create a branch like `feat/shipment-timer` or `fix/pincode-validation`.
2. **Commit often**: Use small, "Atomic" commits. 
3. **Pull Request (PR)**: Ask for a review. Please include a screenshot if you changed the UI.

---

## 📂 Project Organization (The Developer's Map)

### 1. The Backend (`backend/`)
- **`routes/`**: This is the "Entry" layer. Every file here corresponds to a group of URLs (e.g., `auth.js` handles login).
- **`src/app.js`**: The Global Middleware. This is where we handle security headers, CORS, and JSON parsing.
- **`src/session.js`**: The Persistence layer. If you need to change how users stay logged in, look here.

### 2. The Frontend (`js/`)
- **`auth-api.js`**: Handles logic for the Login Page.
- **`admin-core.js`**: A massive file that controls the Admin Dashboard. It handles table rendering and button clicks.
- **`dashboard-guard.js`**: The Frontend Router. It checks if you have the right "Role" before letting you see a page.

---

## 📜 Coding Standards (The Rules)

### 1. Naming Conventions
- **Variables**: Use `camelCase`. (e.g., `userList`, `trackingId`).
- **CSS Classes**: Use `kebab-case`. (e.g., `.status-badge`, `.modal-overlay`).
- **Database Tables**: Use `snake_case`. (e.g., `password_resets`, `organizations`).

### 2. Error Handling (Crucial!)
Every asynchronous operation must be wrapped in a `try/catch`. 
```javascript
// Example: Always catch DB errors
try {
    const res = await db.query('SELECT * FROM shipments');
} catch (err) {
    console.error("DB Select Failed:", err);
    return res.status(500).json({ error: 'System error' });
}
```

---

## 🖱️ UI Toolkit (Our Building Blocks)

We built custom tools so you don't have to write raw HTML every time.

- **`window.MoveXAdmin.modal(title, content, buttons)`**: Creates a consistent, glassmorphic popup.
- **`showToast(message, type)`**: Shows a notification (success/error).
- **CSS Variables**: Check `styles/variables.css`. Always use `var(--brand-primary)` instead of hardcoded hex codes.

---

## 🧪 Testing Policy
We don't have automatic tests yet. You MUST manually verify:
- [ ] **RBAC**: Log in as a `staff` user. Can you see the "Total Revenue" (Admin-only)? If yes, you failed the security check.
- [ ] **Responsiveness**: Resize your browser to 375px. Is the table still readable?
- [ ] **Console**: Open DevTools. Are there any `404` or `500` errors popping up?

---

<p align="center">
  <sub>MoveX Contributor Ecosystem - Version 1.5.0</sub>
</p>
