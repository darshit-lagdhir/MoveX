# MoveX - Next Generation Logistics Platform

<div align="center">
  <h3>A modern, secure logistics and courier management system</h3>
  <p>Built with Node.js, Express, PostgreSQL, and Vanilla JavaScript</p>
</div>

---

## 🚀 Quick Start

### Prerequisites

- **Node.js** 18.x or higher
- **PostgreSQL** 14+ (local) or Supabase account (cloud)
- **npm** or **yarn**

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/movex.git
cd movex

# Install dependencies
cd backend
npm install

# Configure environment
cp ../.env.example ../.env
# Edit .env with your settings

# Start the server
npm start
```

### Access the Application

- **Main Application:** http://localhost:4000
- **Health Check:** http://localhost:4000/api/health
- **Admin Dashboard:** http://localhost:4000/admin/dashboard.html

---

## 📁 Project Structure

```
movex/
├── admin/                  # Admin dashboard HTML pages
├── backend/               
│   ├── db/                # Database connection (backward compat)
│   ├── middleware/        # Express middleware (auth, rate-limit, etc.)
│   ├── routes/            # API route handlers
│   ├── src/
│   │   ├── app.js         # Main Express server
│   │   ├── config/        # Database configuration
│   │   ├── controllers/   # Business logic
│   │   ├── routes/        # Additional routes
│   │   └── session.js     # Session management
│   ├── sql/               # Database migrations
│   └── utils/             # Helper utilities
├── dashboards/            # Role-based dashboard pages
├── js/                    # Frontend JavaScript
├── styles/                # CSS stylesheets
├── .env.example           # Environment template
├── index.html             # Landing page / Login
└── PRODUCTION.md          # Production deployment guide
```

---

## 🔐 User Roles

| Role | Access Level | Dashboard |
|------|--------------|-----------|
| **Admin** | Full system access | `/admin/dashboard.html` |
| **Franchisee** | Franchise management | `/dashboards/franchisee.html` |
| **Staff** | Staff operations | `/dashboards/staff.html` |
| **User** | Standard user access | `/dashboards/user.html` |
| **Customer** | Customer portal | `/dashboards/customer.html` |

---

## 🛠️ Configuration

### Environment Variables

Copy `.env.example` to `.env` and configure:

```env
# Required
NODE_ENV=development
PORT=4000
JWT_SECRET=your-32+-character-secret
SESSION_SECRET=your-32+-character-secret
HEALTH_CHECK_KEY=secret-key-for-health-check

# Database (choose one)
DATABASE_URL=postgresql://...  # Full connection URL
# OR individual settings:
DB_HOST=localhost
DB_PORT=5432
DB_USER=postgres
DB_PASSWORD=yourpassword
DB_NAME=movex_auth
```

See `.env.example` for all available options.

---

## 📖 API Endpoints

### Authentication
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Create new account |
| POST | `/api/auth/login` | User login |
| POST | `/api/auth/logout` | User logout |
| GET | `/api/auth/me` | Current user info |

### Dashboard
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/dashboard/me` | User dashboard data |
| GET | `/api/dashboard/admin` | Admin stats |
| GET | `/api/dashboard/admin/stats` | System statistics |

### Health Check
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/health` | Basic health status |
| GET | `/api/health/detailed` | Detailed health info |
| GET | `/api/health/ready` | Readiness probe |
| GET | `/api/health/live` | Liveness probe |

---

## 🔒 Security Features

- ✅ **Bcrypt** password hashing (cost factor 12)
- ✅ **HttpOnly** secure session cookies
- ✅ **Rate limiting** on authentication endpoints
- ✅ **CORS** with whitelist configuration
- ✅ **CSP** Content Security Policy headers
- ✅ **CSRF** token protection
- ✅ **Input validation** on all endpoints
- ✅ **SQL injection** prevention (parameterized queries)
- ✅ **XSS** protection headers
- ✅ **Enterprise-Grade Loading State** (Prevents UI flicker/jank)

---

## 🗄️ Database

### Supabase (Recommended for Production)

See [PRODUCTION.md](./PRODUCTION.md) for complete Supabase setup guide.

### Local PostgreSQL

```bash
# Create database
createdb movex_auth

# Run migrations
psql -d movex_auth -f backend/sql/001_init_users.sql
psql -d movex_auth -f backend/sql/002_shipment_photos.sql
```

---

## 📸 Photo Storage

MoveX uses Supabase Storage for shipment photos:

- Photos organized by tracking ID
- Private bucket with signed URL access
- Supports: JPEG, PNG, WebP, HEIC
- Max file size: 5MB

See [PRODUCTION.md](./PRODUCTION.md#section-6-storage-strategy-for-photos) for details.

---

## 🚢 Deployment

### Recommended Platforms

- **Railway** - Easy deployment with auto-detection
- **Render** - Flexible hosting options
- **DigitalOcean App Platform** - Scalable container hosting

### Pre-Deployment Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure strong secrets (32+ characters)
- [ ] Set up Supabase database
- [ ] Update `FRONTEND_URL` for CORS
- [ ] Enable `SESSION_SECURE=true` (requires HTTPS)

See [PRODUCTION.md](./PRODUCTION.md) for complete deployment guide.

---

## 🧪 Testing

```bash
cd backend
npm test
```

---

## 📄 Documentation

- **[PRODUCTION.md](./PRODUCTION.md)** - Complete production deployment guide
- **[.env.example](./.env.example)** - Environment variable reference

---

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## 📝 License

MIT License - see [LICENSE](./LICENSE) for details.

---

## 🆘 Support

For issues or questions:
1. Check [PRODUCTION.md](./PRODUCTION.md) troubleshooting section
2. Open a GitHub issue
3. Contact the development team

---

<div align="center">
  <p><strong>MoveX</strong> - Moving logistics forward</p>
</div>
