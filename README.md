# Airline Booking Management System

Internal booking management application for airline ticketing/travel agency staff.

## Features

- **Staff Authentication** — Login with email/password, token-based API
- **Booking Management** — Create, edit, view bookings with passengers
- **Search & Filter** — Search by booking code, PNR, name, phone; filter by status, date
- **Status Tracking** — Pending → Deposite → Paid → Travelled flow
- **Responsive UI** — Works on mobile, tablet, and desktop

## Status Flow

```
pending → deposite → paid → travelled
    ↑         ↑
    └─────────┘  (can go back)

deposite → refunded → cancelled
```

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 19 + Vite 8 + Tailwind CSS 4 |
| Backend | Laravel 13 + Sanctum 4 |
| Database | MySQL (SQLite for testing) |
| HTTP Client | Axios with interceptors |

## Project Structure

```
├── frontend/           React SPA
│   ├── src/
│   │   ├── components/ Reusable UI (Layout, ProtectedRoute)
│   │   ├── context/    AuthContext for state management
│   │   ├── lib/        API client (axios)
│   │   ├── pages/      Route-level pages
│   │   └── App.jsx     Router setup
│   └── ...
├── backend/            Laravel REST API
│   ├── app/
│   │   ├── Http/       Controllers, Requests, Resources
│   │   ├── Models      Booking, Passenger, User
│   │   └── Services    BookingService (transaction logic)
│   ├── database/       Migrations, seeders, factories
│   ├── routes/api.php  API routes
│   └── tests/          Feature tests
├── docs/               Product and technical documentation
└── .claude/            Project rules
```

## Setup

### Prerequisites

- PHP 8.3+
- Composer
- Node.js 18+
- MySQL

### Backend (Laravel API)

```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan db:seed
php artisan serve
```

API runs at `http://localhost:8000`.

**Default admin account:**
- Email: `admin@example.com`
- Password: `password`

### Frontend (React + Vite)

```bash
cd frontend
npm install
cp .env.example .env
npm run dev
```

App runs at `http://localhost:5173`.

### Environment Variables

**Backend (.env)**
```
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=airline_booking
DB_USERNAME=root
DB_PASSWORD=
```

**Frontend (.env)**
```
VITE_API_URL=http://localhost:8000/api
```

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/login` | Login, returns token |
| POST | `/api/auth/logout` | Revoke token |
| GET | `/api/auth/me` | Get current user |
| GET | `/api/bookings` | List bookings (paginated, searchable) |
| POST | `/api/bookings` | Create booking with passengers |
| GET | `/api/bookings/{id}` | Get booking details |
| PUT | `/api/bookings/{id}` | Update booking |
| PATCH | `/api/bookings/{id}/status` | Update status |

## Commands

### Backend
```bash
cd backend
php artisan serve          # Start dev server
php artisan test           # Run tests
php artisan migrate        # Run migrations
php artisan db:seed        # Seed database
```

### Frontend
```bash
cd frontend
npm run dev                # Start dev server
npm run build              # Production build
npm run lint               # Run linter
```

## Documentation

- `docs/01-product-overview.md` — Product requirements
- `docs/02-database-schema.md` — Database design
- `docs/03-api-contract.md` — API specification
- `docs/04-mvp-plan.md` — MVP tasks
- `docs/05-progress.md` — Development progress
- `docs/06-code-explanation.md` — Code walkthrough
