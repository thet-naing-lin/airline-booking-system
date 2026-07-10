# API Contract

Base URL: `/api`

## Authentication
| Method | Endpoint | Purpose |
|---|---|---|
| POST | `/auth/login` | Email/password login; returns Sanctum token |
| POST | `/auth/logout` | Revoke current token |
| GET | `/auth/me` | Current authenticated user |

All booking endpoints require `Authorization: Bearer <token>`.

## Bookings
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/bookings` | Paginated list; search/filter/sort |
| POST | `/bookings` | Create booking with one or more passengers |
| GET | `/bookings/{booking}` | Booking detail with passengers |
| PUT | `/bookings/{booking}` | Update booking and passenger list |
| PATCH | `/bookings/{booking}/status` | Change booking status |

## List Query Parameters
- `search`: booking code, PNR, contact name/phone, passenger name/NRC/phone
- `status`: one allowed status
- `travel_date`: exact date
- `departure_location`
- `destination`
- `page`, `per_page` (default 20, max 100)

## Create Booking Request
```json
{
  "pnr": null,
  "departure_location": "Yangon",
  "destination": "Bangkok",
  "travel_date": "2026-08-20",
  "travel_time": "09:30",
  "airline_name": "Example Airline",
  "flight_number": "XX-101",
  "contact_name": "U Aung Min",
  "contact_phone": "09123456789",
  "deposit_amount": 300000,
  "total_amount": 850000,
  "status": "pending",
  "comment": "Window seat if possible",
  "passengers": [
    {
      "full_name": "U Aung Min",
      "nrc_number": "12/ABC(N)123456",
      "date_of_birth": "1980-03-20",
      "phone_number": "09123456789",
      "passport_number": null,
      "ticket_number": null,
      "seat_number": null
    }
  ]
}
```

## Booking Response Shape
```json
{
  "data": {
    "id": 1,
    "booking_code": "BK-20260710-0001",
    "pnr": "A7XK2P",
    "status": "confirmed",
    "passengers_count": 3,
    "passengers": []
  }
}
```
