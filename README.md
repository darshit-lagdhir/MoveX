# MoveX - Logistics Platform

<div align="center">
  <h3>Modern, secure logistics and courier management system</h3>
  <p>Node.js • Express • PostgreSQL • Vanilla JavaScript</p>
</div>

---

## 🚀 Quick Start

```bash
# Clone & Install
git clone https://github.com/darshit-lagdhir/MoveX.git
cd MoveX/backend
npm install

# Configure & Run
cp ../.env.example ../.env   # Edit with your settings
npm start                     # http://localhost:4000
```

---

## 📁 Structure

```
movex/
├── admin/                 # Admin dashboard pages
├── backend/               # Node.js Express server
│   ├── src/app.js        # Main entry point
│   ├── routes/           # API routes
│   └── sql/              # Database migrations
├── dashboards/           # Role-based dashboard pages
├── js/                   # Frontend JavaScript
├── styles/               # CSS stylesheets
└── index.html            # Landing page / Login
```

---

## 🔐 User Roles

| Role | Dashboard | Access |
|------|-----------|--------|
| Admin | `/admin/dashboard` | Full system |
| Franchisee | `/dashboards/franchisee` | Franchise ops |
| Staff | `/dashboards/staff` | Staff ops |
| User | `/dashboards/user` | Standard |


---

## 🔒 Security

- ✅ Bcrypt password hashing (cost 12)
- ✅ HttpOnly secure session cookies
- ✅ DB-backed sessions (PostgreSQL)
- ✅ Rate limiting on auth endpoints
- ✅ CORS whitelist • CSP headers • CSRF
- ✅ SQL injection prevention
- ✅ XSS protection
- ✅ Loading Protection (anti-FOUC hidden content)

---

## 🛠️ Operations

### Maintenance Mode
Toggle maintenance mode via environment variable without redeploying code.
- **Enable:** Set `MAINTENANCE_MODE=true` in backend env
- **Disable:** Set `MAINTENANCE_MODE=false`
- **Features:**
  - Auto-redirects all traffic to `/maintenance/`
  - Allows Analytics tracking on maintenance page
  - Admin API remains accessible for authenticated admins

### Analytics
Integrated **Cloudflare Web Analytics** for privacy-first traffic tracking.
- Tracks public pages (`index.html`, `maintenance/index.html`)
- Does **not** track internal admin dashboard activity

---

## 🚢 Deployment

**Production Setup:** Cloudflare Pages (Frontend) + Koyeb (Backend)

| Component | Platform | Config |
|-----------|----------|--------|
| Frontend | Cloudflare Pages | `npx wrangler deploy` |
| Backend | Koyeb | `node src/app.js`, Port: 8000 |
| Database | Supabase | PostgreSQL |

See [PRODUCTION.md](./PRODUCTION.md) for complete deployment guide.

---

## 📖 Documentation

| Document | Description |
|----------|-------------|
| [PRODUCTION.md](./PRODUCTION.md) | Full production deployment guide |
| [API.md](./API.md) | API endpoints reference |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | Contributing guidelines |
| [.env.example](./.env.example) | Environment variables |

---

## 🆘 Support

1. Check [PRODUCTION.md](./PRODUCTION.md) troubleshooting section
2. Open a GitHub issue
3. Contact the development team

---

<div align="center">
  <strong>MoveX</strong> - Moving logistics forward
</div>