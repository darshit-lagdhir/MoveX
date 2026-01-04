# 🤝 Contributing to MoveX

Thank you for helping us move the logistics industry forward! We value your contributions and want to make the process as seamless as possible.

---

## 🛤️ Contribution Workflow

We follow a strict **Feature Branching** model to ensure code quality and stability.

1.  **Fork & Clone:** Fork the repository and clone it to your local machine.
2.  **Branching:** Always create a descriptive branch:
    - `feat/description-of-feature`
    - `fix/description-of-bug`
    - `refactor/area-of-code`
3.  **Local Dev:** Follow the [Local Setup](#-local-development-setup) guide below.
4.  **Commitment:** Write **Atomic Commits**. Each commit should represent one logical change.
5.  **Review:** Open a Pull Request (PR) against the `main` branch. Provide screenshots for UI changes.

---

## 🛠️ Local Development Setup

Ensure you have **Node.js 18+** and **PostgreSQL** installed.

```bash
# 1. Clone & Entry
git clone https://github.com/darshit-lagdhir/anothermoveX.git
cd movex

# 2. Infrastructure Setup
cd backend
npm install

# 3. Environment Config
# Copy the template from the root to your local file
cp ../.env.example .env 
# Add your local DB string and secrets
```

---

## 📜 Coding Standards

### 1. General Principles
- **KISS:** Keep It Simple, Stupid. Avoid over-engineering.
- **DRY:** Don't Repeat Yourself. Abstract common logic into helper functions.
- **Security First:** Never trust user input. Use parameterized queries and escape HTML output.

### 2. Backend (Node.js/Express)
- **Error Handling:** Always wrap asynchronous DB calls in `try/catch`. Use global error middleware for unexpected failures.
- **Controller Logic:** Keep controllers slim. Move heavy business logic to separate service files if needed.
- **Middleware:** Use middleware for cross-cutting concerns (Auth, Logs, Rate Limiting).
- **Naming:** use `camelCase` for variables and `PascalCase` for classes/constructors.

### 3. Frontend (Vanilla JS)
- **No Frameworks:** We strictly use Vanilla JS (ES6+) to minimize bundle size and dependencies.
- **State Management:** Use `sessionStorage` or local variables cautiously. Always clean up event listeners.
- **Modularity:** Separate API calls (`js/auth-api.js`) from UI rendering (`js/admin-core.js`).

### 4. Styling (Vanilla CSS)
- **Glassmorphism:** Follow the existing aesthetic using `backdrop-filter: blur()`.
- **Variables:** Use CSS variables defined in `styles/variables.css` for consistent colors and spacing.
- **Responsiveness:** Use Flexbox/Grid. Mobile-first approach is mandatory.

---

## 🏗️ Technical Guidelines for PRs

### Adding a New API Route
1.  Define the route in `backend/routes/`.
2.  Register the route in `backend/src/app.js`.
3.  Add the corresponding controller function in `backend/src/controllers/`.
4.  Update `API.md` with the new endpoint details.

### Creating a New Dashboard Page
1.  Create the HTML file in `dashboards/` or `admin/`.
2.  Add the page to the `DASHBOARDS` map in `js/dashboard-guard.js`.
3.  Ensure the page includes the `role-check` script to prevent unauthorized access.
4.  Update the sidebar partial if the page needs a navigation link.

---

## 🧪 Testing Policy

Current test coverage is manual. Before submitting a PR, you MUST:
- [ ] Verify login/logout flow.
- [ ] Verify role-based access limits (e.g., a `user` cannot access `/admin`).
- [ ] Check console for 404s or 500s.
- [ ] Verify UI responsiveness on mobile (375px width).

---

## 🛡️ Security Vulnerabilities

**Do not open public issues for security vulnerabilities.**  
Please report security concerns directly to the maintainers via private communication channels found in the project's profile.

---

<div align="center">
  <sub>MoveX Contributor Ecosystem - Version 1.5.0</sub>
</div>
