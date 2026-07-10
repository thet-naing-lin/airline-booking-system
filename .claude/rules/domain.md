# Domain Rules

## Booking
A booking is one shared travel arrangement. It stores route, schedule, contact details, PNR, financial data, comments, status, and audit ownership.

## Passenger
A passenger is one actual traveller. Each passenger has their own name, NRC, DOB, optional phone, optional passport number, optional ticket number, and optional seat number.

## Group booking
For three tickets, create one booking and three passengers. The UI displays passenger count from the number of passenger records.

## Status transitions
```text
pending -> confirmed -> travelled
pending -> cancelled
confirmed -> cancelled -> refunded
cancelled -> refunded
```
Do not allow `travelled` to become `pending`. Keep status transition validation in a dedicated service or request rule once status updates are built.

## PNR
PNR means Passenger Name Record / booking reference. It is the reservation locator received from an airline or supplier. It is nullable for pending requests and normally filled when a booking becomes confirmed.
