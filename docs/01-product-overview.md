# Product Overview

## Product
Airline Booking Management System is an internal staff web application for a travel agency or airline ticketing office.

## Problem
Excel-only tracking is hard to search, edit, and control when bookings contain multiple passengers and staff need to track deposits, PNRs, and progress.

## Solution
Store live booking data in MySQL. Use Excel only to import old records and export reports.

## Users
- **Administrator:** manages staff, imports/exports data, sees all business information.
- **Booking staff:** creates and updates bookings and passenger information.
- **Business owner:** views booking lists, travel lists, deposits, and reports.

## MVP In Scope
- Staff login
- Booking CRUD
- Multiple passengers per booking
- PNR, deposits, total amount, comments
- Five booking statuses
- Booking list with search/filter/pagination
- Booking detail and edit screens

## Not MVP
- Airline inventory/API integration
- Online customer booking
- Payment gateway
- PDF tickets/receipts
- WhatsApp/SMS
- Excel import/export
- Dashboard analytics

## Business Terms
- **Booking code:** internal system reference, e.g. `BK-20260710-0001`.
- **PNR:** airline/supplier booking reference; can be blank until reservation confirmation.
- **Contact person:** customer/payer; may not be travelling.
- **Passenger:** person who travels.
