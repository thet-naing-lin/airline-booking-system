# Deployment Guide

## Architecture Overview

```
┌─────────────┐     HTTPS      ┌─────────────────┐     HTTPS      ┌─────────────────┐
│   Vercel    │ ──────────────▶│  Render         │ ──────────────▶│  Railway        │
│  (Frontend) │   VITE_API_URL │  (Laravel API)  │   DB_* envs    │  (MySQL DB)     │
│  React SPA  │                │  PHP 8.4        │                │                 │
└─────────────┘                └─────────────────┘                └─────────────────┘
```

| Service  | Purpose            | Platform |
| -------- | ------------------ | -------- |
| Frontend | React SPA         | Vercel   |
| Backend  | Laravel REST API   | Render   |
| Database | MySQL 8.0          | Railway  |

---

## Issues Found & Fixed

### 1. Dockerfile Not Suitable for Render
**Problem:** The existing Dockerfile runs Nginx + PHP-FPM, which is for VPS. Render expects a single foreground process.

**Fix:** Replaced with `php:8.4-cli` + `artisan serve` approach.

### 2. Missing `vercel.json` for SPA Routing
**Problem:** Without `vercel.json`, Vercel won't correctly route all paths to `index.html` for React Router.

**Fix:** Created `frontend/vercel.json` with SPA rewrite rules.

### 3. Missing Frontend Environment Variables
**Problem:** No `.env.example` for frontend, no documentation of `VITE_API_URL`.

**Fix:** Created `frontend/.env.example` with required variables.

### 4. CORS Not Configured for Production
**Problem:** `FRONTEND_URL` env var was commented out. CORS would block production requests.

**Fix:** Updated `.env.example` with production-ready CORS settings.

### 5. Sanctum Stateful Domains Not Set
**Problem:** `SANCTUM_STATEFUL_DOMAINS` only had localhost. Production domain missing.

**Fix:** Updated `.env.example` with production Sanctum config.

### 6. No `render.yaml` for Infrastructure-as-Code
**Problem:** No deployment config for Render.

**Fix:** Created `render.yaml` for automated deployments.

---

## Part 1: Deploy Database to Railway

### Step 1: Create Railway Account
1. Go to [railway.app](https://railway.app)
2. Sign up with GitHub

### Step 2: Create MySQL Database
1. Click **"New Project"** → **"MySQL"**
2. Name it `airline-booking-db`
3. Once created, click on the MySQL service
4. Go to **"Variables"** tab
5. Note these auto-generated values (you'll need them for Render):
   - `MYSQLHOST`
   - `MYSQLPORT`
   - `MYSQLDATABASE`
   - `MYSQLUSER`
   - `MYSQLPASSWORD`

> **Important:** Railway provides these env vars automatically. You'll copy them to Render's env vars.

### Step 3: Get Database Connection Info
In Railway dashboard → MySQL service → **"Connect"** tab:
- **Host:** `roundhouse.proxy.rlwy.net` (or similar)
- **Port:** `3306`
- **Database:** `railway`
- **Username:** `root`
- **Password:** (shown in Variables tab)

---

## Part 2: Deploy Backend to Render

### Step 1: Create Render Account
1. Go to [render.com](https://render.com)
2. Sign up with GitHub

### Step 2: Create Web Service
1. Click **"New"** → **"Web Service"**
2. Connect your GitHub repo (`airline-booking-system`)
3. Configure:
   - **Name:** `airline-booking-api`
   - **Region:** Singapore (or closest to your users)
   - **Branch:** `main`
   - **Runtime:** Docker
   - **Dockerfile Path:** `./backend/Dockerfile`
   - **Instance Type:** Starter (free tier) or Standard

### Step 3: Set Environment Variables
In Render dashboard → your service → **"Environment"** tab → **"Add Environment Variable"**:

```env
# App
APP_NAME=Airline Booking
APP_ENV=production
APP_DEBUG=false
APP_URL=https://airline-booking-api.onrender.com

# Generate APP_KEY locally and paste it:
# Run: cd backend && php artisan key:generate --show
APP_KEY=base64:YOUR_GENERATED_KEY_HERE

# CORS - must match your Vercel frontend URL
FRONTEND_URL=https://your-frontend-name.vercel.app

# Sanctum - must match your Vercel frontend URL
SANCTUM_STATEFUL_DOMAINS=your-frontend-name.vercel.app

# Database - paste values from Railway MySQL
DB_CONNECTION=mysql
DB_HOST=roundhouse.proxy.rlwy.net
DB_PORT=3306
DB_DATABASE=railway
DB_USERNAME=root
DB_PASSWORD=YOUR_RAILWAY_MYSQL_PASSWORD

# Session
SESSION_DRIVER=cookie
SESSION_LIFETIME=120
SESSION_ENCRYPT=false
SESSION_PATH=/
SESSION_DOMAIN=null

# Cache & Queue
CACHE_STORE=database
QUEUE_CONNECTION=database

# Logging
LOG_CHANNEL=stack
LOG_STACK=single
LOG_LEVEL=info

# SSL for Railway MySQL (required for external connections)
MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
```

**To generate APP_KEY:**
```bash
cd backend
php artisan key:generate --show
```
Copy the output and set it as `APP_KEY` in Render.

### Step 4: Deploy
1. Render auto-deploys on push to `main`
2. Watch the deploy logs for errors
3. First deploy takes 5-10 minutes (building Docker image)
4. Once deployed, visit `https://airline-booking-api.onrender.com/up` to verify

> **Note:** Render assigns a PORT automatically (e.g., 28685). The Dockerfile uses `$PORT` so it always listens on the correct port.

### Step 5: Run Initial Migration & Seed
In Render dashboard → your service → **"Shell"** tab:
```bash
php artisan migrate --force
php artisan db:seed --class=AdminSeeder
```

> **Note:** Render's Shell tab gives you a bash terminal into your running service.

---

## Part 3: Deploy Frontend to Vercel

### Step 1: Create Vercel Account
1. Go to [vercel.com](https://vercel.com)
2. Sign up with GitHub

### Step 2: Import Project
1. Click **"Add New..."** → **"Project"**
2. Import your `airline-booking-system` repository
3. **Framework Preset:** Vite
4. **Root Directory:** `frontend`
5. Click **"Deploy"** (it will fail first time - we need env vars)

### Step 3: Configure Environment Variables
Go to **Settings** → **Environment Variables**:

```env
VITE_API_URL=https://airline-booking-api.onrender.com/api
```

Replace with your actual Render backend URL.

### Step 4: Redeploy
1. Go to **"Deployments"** tab
2. Click **"..."** on the latest deployment → **"Redeploy"**
3. Or push any change to trigger a new deploy

### Step 5: Verify
1. Visit `https://your-frontend-name.vercel.app`
2. You should see the login page
3. Login with admin credentials:
   - Email: `admin@airlinebooking.com`
   - Password: `asdfasdf`

---

## Troubleshooting

### CORS Errors
If you see CORS errors in browser console:

1. Verify `FRONTEND_URL` in Render matches your Vercel URL exactly (including `https://`)
2. Check that `APP_DEBUG=false` in production
3. Clear Laravel config cache:
   ```bash
   # In Render Shell
   php artisan config:clear
   php artisan config:cache
   ```

### 401 Unauthorized on Login
If login returns 401:

1. Verify database migration ran: check `users` table exists
2. Verify admin seeder ran: check `users` table has admin user
3. Check `APP_KEY` is set correctly

### Database Connection Refused
If backend can't connect to database:

1. Verify Railway MySQL is running (check Railway dashboard)
2. Copy the exact host, port, database, username, password from Railway
3. Ensure `DB_HOST` doesn't have `http://` prefix (just the hostname)
4. Check Railway MySQL isn't paused (free tier pauses after inactivity)
5. **Add SSL env var** - Railway MySQL requires SSL for external connections:
   ```env
   MYSQL_ATTR_SSL_CA=/etc/ssl/certs/ca-certificates.crt
   ```

### Frontend Shows Blank Page
If Vercel shows blank page:

1. Check build logs for errors
2. Verify `VITE_API_URL` env var is set in Vercel
3. Check browser console for JS errors

### Render Build Fails
If Render build fails:

1. Check deploy logs for specific error
2. Ensure `composer.json` and `composer.lock` are committed
3. Ensure `backend/Dockerfile` exists and is correct
4. Try running `composer update` locally and committing `composer.lock`

### Health Check Fails
Backend `/up` endpoint returns error:

1. Check Render deploy logs for PHP errors
2. Verify all env vars are set correctly
3. Check database connection (see "Database Connection Refused" above)

### Render Free Tier Sleeps
Render free tier services sleep after 15 minutes of inactivity:

1. First request after sleep takes 30-60 seconds
2. This is normal for free tier
3. Consider upgrading to Starter ($7/month) for always-on service

---

## Environment Variables Summary

### Railway (MySQL Database only)
| Variable | Where to Find |
|----------|---------------|
| `MYSQLHOST` | Railway → MySQL → Variables tab |
| `MYSQLPORT` | Railway → MySQL → Variables tab |
| `MYSQLDATABASE` | Railway → MySQL → Variables tab |
| `MYSQLUSER` | Railway → MySQL → Variables tab |
| `MYSQLPASSWORD` | Railway → MySQL → Variables tab |

### Render (Backend)
| Variable | Value |
|----------|-------|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://airline-booking-api.onrender.com` |
| `APP_KEY` | `base64:...` (generated locally) |
| `FRONTEND_URL` | `https://your-app.vercel.app` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` | `roundhouse.proxy.rlwy.net` (from Railway) |
| `DB_PORT` | `3306` (from Railway) |
| `DB_DATABASE` | `railway` (from Railway) |
| `DB_USERNAME` | `root` (from Railway) |
| `DB_PASSWORD` | (from Railway) |
| `MYSQL_ATTR_SSL_CA` | `/etc/ssl/certs/ca-certificates.crt` |
| `SANCTUM_STATEFUL_DOMAINS` | `your-app.vercel.app` |

### Vercel (Frontend)
| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://airline-booking-api.onrender.com/api` |

---

## Post-Deployment Checklist

- [ ] Railway MySQL is running
- [ ] Render backend is deployed and `/up` returns 200
- [ ] Database migration ran successfully
- [ ] Admin user seeded successfully
- [ ] Vercel frontend is deployed
- [ ] Login works with admin credentials
- [ ] Can create a booking
- [ ] Can view bookings list
- [ ] CORS headers present in API responses
- [ ] No mixed-content warnings (all HTTPS)
