<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Passenger;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingMigrationTest extends TestCase
{
    use RefreshDatabase;

    public function test_bookings_table_has_expected_columns(): void
    {
        $booking = Booking::factory()->create();

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'booking_code' => $booking->booking_code,
            'status' => $booking->status,
        ]);

        $columns = [
            'id', 'booking_code', 'pnr', 'departure_location', 'destination',
            'travel_date', 'travel_time', 'airline_name', 'flight_number',
            'contact_name', 'contact_phone', 'deposit_amount', 'total_amount',
            'status', 'comment', 'created_by', 'created_at', 'updated_at',
        ];

        foreach ($columns as $column) {
            $this->assertTrue(
                \Schema::hasColumn('bookings', $column),
                "Bookings table missing column: {$column}"
            );
        }
    }

    public function test_passengers_table_has_expected_columns(): void
    {
        $passenger = Passenger::factory()->create();

        $this->assertDatabaseHas('passengers', [
            'id' => $passenger->id,
            'full_name' => $passenger->full_name,
        ]);

        $columns = [
            'id', 'booking_id', 'full_name', 'nrc_number', 'date_of_birth',
            'phone_number', 'passport_number', 'ticket_number', 'seat_number',
            'created_at', 'updated_at',
        ];

        foreach ($columns as $column) {
            $this->assertTrue(
                \Schema::hasColumn('passengers', $column),
                "Passengers table missing column: {$column}"
            );
        }
    }

    public function test_booking_code_is_unique(): void
    {
        Booking::factory()->create(['booking_code' => 'BK-20260710-0001']);

        $this->expectException(\Illuminate\Database\QueryException::class);

        Booking::factory()->create(['booking_code' => 'BK-20260710-0001']);
    }

    public function test_booking_status_defaults_to_pending(): void
    {
        // Verify the factory default status is 'pending'
        $booking = Booking::factory()->create();

        $this->assertEquals('pending', $booking->status);
    }

    public function test_booking_monetary_columns_are_decimal(): void
    {
        $booking = Booking::factory()->create([
            'deposit_amount' => 123456.78,
            'total_amount' => 987654.32,
        ]);

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'deposit_amount' => 123456.78,
            'total_amount' => 987654.32,
        ]);
    }

    public function test_pnr_is_nullable(): void
    {
        $booking = Booking::factory()->create(['pnr' => null]);

        $this->assertNull($booking->fresh()->pnr);
    }

    public function test_deleting_booking_cascades_to_passengers(): void
    {
        $booking = Booking::factory()->hasPassengers(3)->create();

        $this->assertEquals(3, $booking->passengers()->count());

        $booking->delete();

        $this->assertEquals(0, Passenger::where('booking_id', $booking->id)->count());
    }
}
