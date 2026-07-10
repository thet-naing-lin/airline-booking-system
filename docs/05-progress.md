# Progress

## Current Task
Task 5 — Frontend Foundation

## Completed
- [x] Task 1 — Initialize Repository
- [x] Task 2 — Backend Foundation
- [x] Task 3 — Booking Database
- [x] Task 4 — Booking API

## Task Details

### Task 1 — Initialize Repository
- Created Laravel 13 project in `backend/`
- Created React + Vite 8 project in `frontend/`
- Added Tailwind CSS v4
- Updated README.md with setup instructions

### Task 2 — Backend Foundation
- Installed Laravel Sanctum 4.x
- Configured MySQL database
- Created auth routes: login, logout, me
- Added users.role migration (admin/staff)
- Seeded admin account (admin@example.com)

### Task 3 — Booking Database
- Created bookings migration
- Created passengers migration with cascadeOnDelete
- Added Booking model with relationships
- Added Passenger model with relationships
- Implemented status and money casts
- Created factories for both models
- Wrote 17 tests (all passing)

### Task 4 — Booking API
- Created BookingController with CRUD + status
- Created Form Requests for validation
- Created API Resources for response shape
- Created BookingService for transaction logic
- Added search/filter/pagination
- Wrote 22 API tests (39 total tests passing)

## Next Actions
1. Create React app shell with router
2. Configure Axios API client with VITE_API_URL
3. Create login page
4. Create app layout with sidebar/header

## Decisions Log
- React frontend and Laravel API are separate projects in one repository.
- MySQL is the operational database.
- Excel is import/export only, not the live database.
- `passenger_count` is calculated, not stored.
- Booking statuses: pending, confirmed, travelled, cancelled, refunded.
- Use Form Requests for validation, not inline validation.
- Use API Resources for consistent response shape.
- Use Service class for transaction logic (Domain Rule #7).
- Money stored as decimal(12,2), never float (Domain Rule #8).

## Test Results
- Task 3: 17 tests, 54 assertions
- Task 4: 39 tests, 141 assertions (all passing)
