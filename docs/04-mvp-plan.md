# MVP Plan

## MVP Goal
An authorized staff member can log in, create a group booking, add all passengers, save PNR/deposit/status, search bookings, and edit a booking.

## Task 1 — Initialize Repository
**Goal:** Create a clean monorepo and verify both applications run.

Acceptance criteria:
- [ ] Repository has `frontend/`, `backend/`, `docs/`, `.claude/`
- [ ] Laravel API is reachable locally
- [ ] React app is reachable locally
- [ ] Root README explains commands
- [ ] `.env.example` files exist; `.env` is ignored

## Task 2 — Backend Foundation
**Goal:** Database and authentication baseline.

Acceptance criteria:
- [ ] MySQL environment configured
- [ ] Sanctum installed/configured
- [ ] `users.role` migration has admin/staff values
- [ ] Login, logout, and me endpoints work in Postman
- [ ] Admin seed account exists locally

## Task 3 — Booking Database
**Goal:** Implement models/migrations/relationships.

Acceptance criteria:
- [ ] Bookings and passengers migrations match schema document
- [ ] `Booking` has many `Passenger`
- [ ] Booking belongs to creator User
- [ ] Status enum/cast is implemented
- [ ] Migration and relationship tests pass

## Task 4 — Booking API
**Goal:** Full API for booking lifecycle.

Acceptance criteria:
- [ ] Create booking with at least one passenger inside a DB transaction
- [ ] List endpoint returns pagination and `passengers_count`
- [ ] Detail endpoint includes passengers
- [ ] Update endpoint replaces/updates passengers safely
- [ ] Search and filters work
- [ ] Invalid input returns field validation errors

## Task 5 — Frontend Foundation
**Goal:** React application shell and API connection.

Acceptance criteria:
- [ ] Tailwind configured
- [ ] Router configured
- [ ] Axios/API client reads `VITE_API_URL`
- [ ] Login page stores token and protects routes
- [ ] App layout with sidebar/header exists

## Task 6 — Booking List
**Goal:** Staff can find bookings.

Acceptance criteria:
- [ ] Paginated booking table
- [ ] Search by name, NRC, phone, booking code, PNR
- [ ] Status and travel-date filters
- [ ] Shows calculated passenger count
- [ ] Status badges are clear

## Task 7 — Create and Edit Booking
**Goal:** Staff can manage group bookings.

Acceptance criteria:
- [ ] Booking form has shared booking fields
- [ ] Dynamic passenger rows: add/remove passengers
- [ ] At least one passenger required
- [ ] Edit form loads and saves existing values
- [ ] Form shows Laravel validation errors

## Task 8 — Detail and Status
**Goal:** Staff can review one full booking and update its state.

Acceptance criteria:
- [ ] Detail page shows booking, money, PNR, contact, and passengers
- [ ] Status update control follows permitted transitions
- [ ] Confirmed bookings can have PNR updated

## After MVP
Excel import/export, dashboard, user management, audit log, PDF/receipt, notifications, deployment.
