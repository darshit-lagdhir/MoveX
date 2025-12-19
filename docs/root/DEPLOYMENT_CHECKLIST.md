# MoveX Deployment Checklist

## Pre-Deployment (BEFORE going live)

### Backend Configuration
- [ ] All secrets moved to environment variables (no hardcoded secrets in code)
- [ ] .env file created and added to .gitignore
- [ ] DATABASE_URL / DB_* variables configured correctly
- [ ] JWT_SECRET is strong (32+ chars, random)
- [ ] NODE_ENV set to "production"
- [ ] HTTPS enabled / enforced
- [ ] CORS configured to match frontend domain only
- [ ] Rate limiting thresholds appropriate for production

### Frontend Configuration
- [ ] API_BASE points to production backend URL
- [ ] No hardcoded localhost references
- [ ] tamper.js lockdown active
- [ ] All deprecated offline security files deleted
- [ ] HTTPS enforced
- [ ] No console logs exposing secrets

### Database
- [ ] PostgreSQL version compatible (9.6+)
- [ ] All migrations applied
- [ ] Backup system configured
- [ ] Database user has LEAST privilege (no SUPERUSER)
- [ ] SSL enabled between app and database
- [ ] Database not publicly accessible (firewall rules)

### Security Headers
- [ ] X-Frame-Options: DENY
- [ ] X-Content-Type-Options: nosniff
- [ ] Content-Security-Policy configured
- [ ] Strict-Transport-Security enabled (HTTPS only)
- [ ] CORS headers restrictive

### Hosting Platform
- [ ] Backend hosting selected (Railway, Render, Heroku, VPS, etc.)
- [ ] Frontend hosting selected (Vercel, Netlify, S3 + CloudFront, etc.)
- [ ] Secrets manager configured (platform's secret store)
- [ ] Auto-scaling / resource limits set appropriately
- [ ] Monitoring enabled (error tracking, uptime monitoring)
- [ ] Log aggregation configured

### Health & Monitoring
- [ ] /health endpoint responds with 200
- [ ] Error tracking service configured (Sentry, LogRocket, etc.)
- [ ] Uptime monitoring enabled
- [ ] Alert thresholds set
- [ ] Database connection pooling configured

### Testing
- [ ] All unit tests pass
- [ ] Integration tests pass
- [ ] Manual end-to-end testing complete
- [ ] Role-based access control verified
- [ ] Session security verified
- [ ] Error responses are generic (no leaks)

---

## Deployment Steps

### 1. Deploy Backend

**Option A: Railway.app**
```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Initialize project
railway init

# Set environment variables
railway variables

# Deploy
railway up
```

**Option B: Render.com**
```
1. Create new Web Service
2. Connect GitHub repo
3. Set Start Command: npm start
4. Add Environment Variables (copy from .env)
5. Deploy
```

**Option C: Heroku (deprecated but example)**
```bash
heroku create movex-api
heroku config:set JWT_SECRET=...
heroku config:set DATABASE_URL=...
git push heroku main
```

### 2. Deploy Frontend

**Option A: Vercel**
```bash
npm install -g vercel
vercel
# Follow prompts, set API_BASE env var
```

**Option B: Netlify**
```bash
npm install -g netlify-cli
netlify deploy
# Set environment variables in dashboard
```

**Option C: AWS S3 + CloudFront**
```bash
aws s3 sync dist/ s3://movex-frontend-bucket/
aws cloudfront create-invalidation --distribution-id YOUR_ID --paths "/*"
```

### 3. Configure DNS
- [ ] Point domain to frontend hosting
- [ ] SSL certificate configured (auto via platform)
- [ ] API domain configured (separate subdomain recommended)

### 4. Verify Deployment
- [ ] Frontend loads over HTTPS
- [ ] Backend API reachable
- [ ] Login flow works end-to-end
- [ ] Dashboards load correctly
- [ ] Cookies set and persisted
- [ ] Password reset emails send

---

## Post-Deployment

### Day 1
- [ ] Monitor error logs for issues
- [ ] Verify users can register and login
- [ ] Check database backups running
- [ ] Confirm monitoring alerts working

### Week 1
- [ ] Review error tracking logs
- [ ] Check for any performance issues
- [ ] Verify no security alerts
- [ ] Get initial user feedback

### Ongoing
- [ ] Weekly backup verification
- [ ] Monthly security review
- [ ] Quarterly dependency updates
- [ ] Annual penetration testing

---

## Rollback Plan

If critical issue discovered:

1. Identify problem (check error logs)
2. Revert to last working commit
3. Redeploy previous version
4. Notify users if applicable
5. Investigate root cause
6. Fix and test thoroughly
7. Redeploy with fix

---

## Status

- **Checklist Started:** [DATE]
- **Deployment Date:** [DATE]
- **Deployed By:** [NAME]
- **Approved By:** [NAME]

✓ All items completed and verified
