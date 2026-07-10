# Airline Booking Management System

Internal booking management application for airline ticketing/travel agency staff.

## Apps
- `frontend/` — React + Vite
- `backend/` — Laravel API + Sanctum + MySQL

## Documentation
- `docs/01-product-overview.md`
- `docs/02-database-schema.md`
- `docs/03-api-contract.md`
- `docs/04-mvp-plan.md`
- `docs/05-progress.md`

## Setup

### Backend (Laravel API)
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
```
API runs at `http://localhost:8000`.

### Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```
App runs at `http://localhost:5173`.

### Environment
- Backend requires PHP 8.2+ and MySQL (or SQLite for local dev).
- Frontend reads `VITE_API_URL` from `.env` to point at the backend.

## Start with Claude Code
```bash
claude
```
Then say:
```text
Read CLAUDE.md and docs/04-mvp-plan.md. Start Task 1 only. Inspect the repository first, give me the exact commands, and wait for my confirmation before creating projects.
```
