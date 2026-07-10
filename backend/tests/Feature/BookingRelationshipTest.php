<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Passenger;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BookingRelationshipTest extends TestCase
{
    use RefreshDatabase;

    public function test_booking_belongs_to_creator(): void
    {
        $user = User::factory()->create();
        $booking = Booking::factory()->create(['created_by' => $user->id]);

        $this->assertNotNull($booking->creator);
        $this->assertEquals($user->id, $booking->creator->id);
    }

    public function test_booking_has_many_passengers(): void
    {
        $booking = Booking::factory()->hasPassengers(3)->create();

        $this->assertEquals(3, $booking->passengers()->count());
        $this->assertInstanceOf(Passenger::class, $booking->passengers->first());
    }

    public function test_passenger_belongs_to_booking(): void
    {
        $booking = Booking::factory()->create();
        $passenger = Passenger::factory()->create(['booking_id' => $booking->id]);

        $this->assertNotNull($passenger->booking);
        $this->assertEquals($booking->id, $passenger->booking->id);
    }

    public function test_booking_passengers_count_via_with_count(): void
    {
        $booking = Booking::factory()->hasPassengers(5)->create();

        $bookingWithCount = Booking::withCount('passengers')->find($booking->id);

        $this->assertEquals(5, $bookingWithCount->passengers_count);
    }

    public function test_booking_status_casts_correctly(): void
    {
        $booking = Booking::factory()->create(['status' => 'confirmed']);

        $this->assertEquals('confirmed', $booking->status);
        $this->assertIsString($booking->status);
    }

    public function test_booking_travel_date_casts_to_date(): void
    {
        $booking = Booking::factory()->create(['travel_date' => '2026-08-15']);

        $this->assertInstanceOf(\Illuminate\Support\Carbon::class, $booking->travel_date);
        $this->assertEquals('2026-08-15', $booking->travel_date->format('Y-m-d'));
    }

    public function test_booking_deposit_amount_casts_to_decimal(): void
    {
        $booking = Booking::factory()->create(['deposit_amount' => 50000]);

        $this->assertIsString($booking->deposit_amount);
        $this->assertEquals('50000.00', $booking->deposit_amount);
    }

    public function test_booking_total_amount_casts_to_decimal(): void
    {
        $booking = Booking::factory()->create(['total_amount' => 150000.50]);

        $this->assertIsString($booking->total_amount);
        $this->assertEquals('150000.50', $booking->total_amount);
    }
}
