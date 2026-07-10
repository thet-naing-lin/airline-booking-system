# Airline Booking Management System

## Purpose
Internal web app for an airline ticketing/travel agency to manage group bookings, passengers, PNRs, deposits, statuses, and Excel import/export. This is **not** a public airline reservation engine and does not connect to airline inventory in the MVP.

## Stack
- `frontend/`: React + Vite + Tailwind CSS
- `backend/`: Laravel API + Sanctum + MySQL
- Excel: `maatwebsite/excel`
- Frontend deploy target: Vercel
- Backend deploy target: Render/Railway/standard PHP host

## Repository Structure
```text
frontend/     React SPA
backend/      Laravel REST API
docs/         Product, schema, API, and MVP specifications
.claude/      Project rules and Claude-specific guidance
```

## Non-Negotiable Domain Rules
1. A `Booking` has many `Passenger` records. Never manually persist `passenger_count`; calculate it with `withCount('passengers')`.
2. A booking has one shared itinerary, contact person, financial values, booking code, and optional PNR.
3. PNR belongs on `bookings`, never on `passengers`. PNR may be empty while status is `pending`.
4. Valid booking statuses only: `pending`, `confirmed`, `travelled`, `cancelled`, `refunded`. Do not add `complete`.
5. Ticket number and seat number belong to an individual passenger.
6. A contact person may not be a passenger.
7. Use database transactions whenever creating/updating a booking together with passengers.
8. Store money as `decimal(12,2)`, never float.
9. Validate every API input in Laravel Form Requests. Frontend validation is UX only.

## Working Rules
- Read the relevant documents in `docs/` and `.claude/rules/` before changing a feature.
- Work on one MVP task at a time. Do not start Excel, dashboards, PDF tickets, notifications, or deployment until the current MVP task is accepted.
- Before modifying files: inspect the existing code and propose a short plan.
- Prefer simple, readable code over clever abstractions.
- Do not invent database fields or API behavior that conflicts with `docs/02-database-schema.md` or `docs/03-api-contract.md`. Ask first if a business decision is missing.
- Never put secrets in committed files. Use `.env` and keep `.env.example` updated.
- Run relevant formatting/tests after changes and state exactly what was run.

## Commands
See `.claude/rules/development.md` for expected commands. Confirm installed versions and scripts before assuming a command exists.

## Current Scope
Start from `docs/04-mvp-plan.md`, Task 1: repository initialization and health checks.
