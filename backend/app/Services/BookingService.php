<?php

namespace App\Services;

use App\Models\Booking;
use Illuminate\Support\Facades\DB;

class BookingService
{
    /**
     * Create a booking with passengers inside a database transaction.
     */
    public function create(array $data, int $createdBy): Booking
    {
        return DB::transaction(function () use ($data, $createdBy) {
            $booking = Booking::create([
                'booking_code' => $this->generateBookingCode(),
                'pnr' => $data['pnr'] ?? null,
                'departure_location' => $data['departure_location'],
                'destination' => $data['destination'],
                'travel_date' => $data['travel_date'],
                'travel_time' => $data['travel_time'] ?? null,
                'airline_name' => $data['airline_name'] ?? null,
                'flight_number' => $data['flight_number'] ?? null,
                'contact_name' => $data['contact_name'],
                'contact_phone' => $data['contact_phone'],
                'deposit_amount' => $data['deposit_amount'] ?? 0,
                'total_amount' => $data['total_amount'] ?? 0,
                'status' => $data['status'] ?? 'pending',
                'comment' => $data['comment'] ?? null,
                'created_by' => $createdBy,
            ]);

            $booking->passengers()->createMany($data['passengers']);

            return $booking->loadCount('passengers')->load('passengers');
        });
    }

    /**
     * Update a booking and replace its passengers inside a database transaction.
     */
    public function update(Booking $booking, array $data): Booking
    {
        return DB::transaction(function () use ($booking, $data) {
            $booking->update([
                'pnr' => $data['pnr'] ?? $booking->pnr,
                'departure_location' => $data['departure_location'],
                'destination' => $data['destination'],
                'travel_date' => $data['travel_date'],
                'travel_time' => $data['travel_time'] ?? null,
                'airline_name' => $data['airline_name'] ?? null,
                'flight_number' => $data['flight_number'] ?? null,
                'contact_name' => $data['contact_name'],
                'contact_phone' => $data['contact_phone'],
                'deposit_amount' => $data['deposit_amount'] ?? $booking->deposit_amount,
                'total_amount' => $data['total_amount'] ?? $booking->total_amount,
                'comment' => $data['comment'] ?? null,
            ]);

            // Sync passengers: update existing, create new, delete removed
            $existingIds = collect($data['passengers'])
                ->pluck('id')
                ->filter()
                ->toArray();

            // Delete passengers not in the update request
            $booking->passengers()
                ->whereNotIn('id', $existingIds)
                ->delete();

            // Update or create passengers
            foreach ($data['passengers'] as $passengerData) {
                if (!empty($passengerData['id'])) {
                    $booking->passengers()
                        ->where('id', $passengerData['id'])
                        ->update(collect($passengerData)->except('id')->toArray());
                } else {
                    $booking->passengers()->create($passengerData);
                }
            }

            return $booking->loadCount('passengers')->load('passengers');
        });
    }

    /**
     * Generate a unique booking code: BK-YYYYMMDD-NNNN
     */
    private function generateBookingCode(): string
    {
        $date = now()->format('Ymd');
        $lastBooking = Booking::where('booking_code', 'like', "BK-{$date}-%")
            ->orderByDesc('booking_code')
            ->first();

        if ($lastBooking) {
            $lastNumber = (int) substr($lastBooking->booking_code, -4);
            $nextNumber = $lastNumber + 1;
        } else {
            $nextNumber = 1;
        }

        return 'BK-' . $date . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
    }
}
