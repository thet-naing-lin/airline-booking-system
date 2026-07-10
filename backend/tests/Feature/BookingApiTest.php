<?php

namespace Tests\Feature;

use App\Models\Booking;
use App\Models\Passenger;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class BookingApiTest extends TestCase
{
    use RefreshDatabase;

    private User $user;

    protected function setUp(): void
    {
        parent::setUp();
        $this->user = User::factory()->create(['role' => 'staff']);
    }

    // ── Index / List ──────────────────────────────────────

    public function test_index_returns_paginated_bookings(): void
    {
        Sanctum::actingAs($this->user);
        Booking::factory()->count(3)->create(['created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings');

        $response->assertOk()
            ->assertJsonCount(3, 'data')
            ->assertJsonStructure([
                'data' => [
                    '*' => ['id', 'booking_code', 'passengers_count'],
                ],
            ]);
    }

    public function test_index_includes_passengers_count(): void
    {
        Sanctum::actingAs($this->user);
        Booking::factory()->hasPassengers(3)->create(['created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings');

        $response->assertOk()
            ->assertJsonPath('data.0.passengers_count', 3);
    }

    public function test_indexPaginates_with_custom_per_page(): void
    {
        Sanctum::actingAs($this->user);
        Booking::factory()->count(15)->create(['created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings?per_page=5');

        $response->assertOk()
            ->assertJsonCount(5, 'data');
    }

    // ── Search ────────────────────────────────────────────

    public function test_index_searches_by_booking_code(): void
    {
        Sanctum::actingAs($this->user);
        Booking::factory()->create(['booking_code' => 'BK-20260710-0001', 'created_by' => $this->user->id]);
        Booking::factory()->create(['booking_code' => 'BK-20260710-0002', 'created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings?search=BK-20260710-0001');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.booking_code', 'BK-20260710-0001');
    }

    public function test_index_searches_by_contact_name(): void
    {
        Sanctum::actingAs($this->user);
        Booking::factory()->create(['contact_name' => 'U Aung Min', 'created_by' => $this->user->id]);
        Booking::factory()->create(['contact_name' => 'U Kyaw Zin', 'created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings?search=Aung');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.contact_name', 'U Aung Min');
    }

    public function test_index_searches_by_passenger_name(): void
    {
        Sanctum::actingAs($this->user);
        $booking = Booking::factory()->create(['created_by' => $this->user->id]);
        $booking->passengers()->create(['full_name' => 'Daw Thin Thin']);
        Booking::factory()->hasPassengers(1)->create(['created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings?search=Thin');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    // ── Filters ───────────────────────────────────────────

    public function test_index_filters_by_status(): void
    {
        Sanctum::actingAs($this->user);
        Booking::factory()->paid()->create(['created_by' => $this->user->id]);
        Booking::factory()->cancelled()->create(['created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings?status=paid');

        $response->assertOk()
            ->assertJsonCount(1, 'data')
            ->assertJsonPath('data.0.status', 'paid');
    }

    public function test_index_filters_by_travel_date(): void
    {
        Sanctum::actingAs($this->user);
        Booking::factory()->create(['travel_date' => '2026-08-15', 'created_by' => $this->user->id]);
        Booking::factory()->create(['travel_date' => '2026-09-01', 'created_by' => $this->user->id]);

        $response = $this->getJson('/api/bookings?travel_date=2026-08-15');

        $response->assertOk()
            ->assertJsonCount(1, 'data');
    }

    // ── Store / Create ────────────────────────────────────

    public function test_store_creates_booking_with_passengers(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'departure_location' => 'Yangon',
            'destination' => 'Bangkok',
            'travel_date' => '2026-08-20',
            'contact_name' => 'U Aung Min',
            'contact_phone' => '09123456789',
            'deposit_amount' => 300000,
            'total_amount' => 850000,
            'passengers' => [
                ['full_name' => 'U Aung Min'],
                ['full_name' => 'Daw Aye Aye'],
            ],
        ];

        $response = $this->postJson('/api/bookings', $payload);

        $response->assertCreated()
            ->assertJsonPath('data.passengers_count', 2)
            ->assertJsonStructure([
                'message',
                'data' => ['id', 'booking_code', 'passengers'],
            ]);

        $this->assertDatabaseHas('bookings', [
            'departure_location' => 'Yangon',
            'status' => 'pending',
        ]);
        $this->assertEquals(2, Passenger::count());
    }

    public function test_store_generates_unique_booking_code(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'departure_location' => 'Yangon',
            'destination' => 'Bangkok',
            'travel_date' => '2026-08-20',
            'contact_name' => 'U Aung Min',
            'contact_phone' => '09123456789',
            'passengers' => [['full_name' => 'U Aung Min']],
        ];

        $this->postJson('/api/bookings', $payload)->assertCreated();
        $this->postJson('/api/bookings', $payload)->assertCreated();

        $bookings = Booking::all();
        $this->assertEquals(2, $bookings->count());
        $this->assertNotEquals(
            $bookings[0]->booking_code,
            $bookings[1]->booking_code
        );
    }

    public function test_store_requires_at_least_one_passenger(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'departure_location' => 'Yangon',
            'destination' => 'Bangkok',
            'travel_date' => '2026-08-20',
            'contact_name' => 'U Aung Min',
            'contact_phone' => '09123456789',
            'passengers' => [],
        ];

        $this->postJson('/api/bookings', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('passengers');
    }

    public function test_store_validates_required_fields(): void
    {
        Sanctum::actingAs($this->user);

        $this->postJson('/api/bookings', [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'departure_location',
                'destination',
                'travel_date',
                'contact_name',
                'contact_phone',
                'passengers',
            ]);
    }

    public function test_store_validates_passenger_required_fields(): void
    {
        Sanctum::actingAs($this->user);

        $payload = [
            'departure_location' => 'Yangon',
            'destination' => 'Bangkok',
            'travel_date' => '2026-08-20',
            'contact_name' => 'U Aung Min',
            'contact_phone' => '09123456789',
            'passengers' => [
                ['nrc_number' => '12/ABC(N)123456'],
            ],
        ];

        $this->postJson('/api/bookings', $payload)
            ->assertUnprocessable()
            ->assertJsonValidationErrors('passengers.0.full_name');
    }

    public function test_store_returns_401_without_token(): void
    {
        $this->postJson('/api/bookings', [])
            ->assertUnauthorized();
    }

    // ── Show / Detail ─────────────────────────────────────

    public function test_show_returns_booking_with_passengers(): void
    {
        Sanctum::actingAs($this->user);
        $booking = Booking::factory()->hasPassengers(3)->create(['created_by' => $this->user->id]);

        $response = $this->getJson("/api/bookings/{$booking->id}");

        $response->assertOk()
            ->assertJsonPath('data.id', $booking->id)
            ->assertJsonCount(3, 'data.passengers');
    }

    public function test_show_returns_404_for_nonexistent_booking(): void
    {
        Sanctum::actingAs($this->user);

        $this->getJson('/api/bookings/999')
            ->assertNotFound();
    }

    // ── Update ────────────────────────────────────────────

    public function test_update_modifies_booking_and_passengers(): void
    {
        Sanctum::actingAs($this->user);
        $booking = Booking::factory()->hasPassengers(2)->create(['created_by' => $this->user->id]);

        $payload = [
            'departure_location' => 'Mandalay',
            'destination' => 'Bangkok',
            'travel_date' => '2026-09-01',
            'contact_name' => 'U Kyaw Zin',
            'contact_phone' => '09876543210',
            'passengers' => [
                ['full_name' => 'U Kyaw Zin'],
            ],
        ];

        $response = $this->putJson("/api/bookings/{$booking->id}", $payload);

        $response->assertOk()
            ->assertJsonPath('data.departure_location', 'Mandalay')
            ->assertJsonPath('data.passengers_count', 1);

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'departure_location' => 'Mandalay',
        ]);
    }

    public function test_update_removes_passengers_not_in_payload(): void
    {
        Sanctum::actingAs($this->user);
        $booking = Booking::factory()->hasPassengers(3)->create(['created_by' => $this->user->id]);
        $passengerIds = $booking->passengers->pluck('id')->toArray();

        $payload = [
            'departure_location' => $booking->departure_location,
            'destination' => $booking->destination,
            'travel_date' => $booking->travel_date->format('Y-m-d'),
            'contact_name' => $booking->contact_name,
            'contact_phone' => $booking->contact_phone,
            'passengers' => [
                ['id' => $passengerIds[0], 'full_name' => 'Updated Name'],
            ],
        ];

        $this->putJson("/api/bookings/{$booking->id}", $payload)
            ->assertOk();

        $this->assertDatabaseHas('passengers', [
            'id' => $passengerIds[0],
            'full_name' => 'Updated Name',
        ]);
        $this->assertDatabaseMissing('passengers', ['id' => $passengerIds[1]]);
        $this->assertDatabaseMissing('passengers', ['id' => $passengerIds[2]]);
    }

    public function test_update_validates_required_fields(): void
    {
        Sanctum::actingAs($this->user);
        $booking = Booking::factory()->create(['created_by' => $this->user->id]);

        $this->putJson("/api/bookings/{$booking->id}", [])
            ->assertUnprocessable()
            ->assertJsonValidationErrors([
                'departure_location',
                'destination',
                'travel_date',
                'contact_name',
                'contact_phone',
                'passengers',
            ]);
    }

    // ── Update Status ─────────────────────────────────────

    public function test_update_status_changes_booking_status(): void
    {
        Sanctum::actingAs($this->user);
        $booking = Booking::factory()->create([
            'status' => 'pending',
            'created_by' => $this->user->id,
        ]);

        $response = $this->patchJson("/api/bookings/{$booking->id}/status", [
            'status' => 'deposite',
        ]);

        $response->assertOk()
            ->assertJsonPath('data.status', 'deposite');

        $this->assertDatabaseHas('bookings', [
            'id' => $booking->id,
            'status' => 'deposite',
        ]);
    }

    public function test_update_status_validates_invalid_status(): void
    {
        Sanctum::actingAs($this->user);
        $booking = Booking::factory()->create(['created_by' => $this->user->id]);

        $this->patchJson("/api/bookings/{$booking->id}/status", [
            'status' => 'invalid_status',
        ])
            ->assertUnprocessable()
            ->assertJsonValidationErrors('status');
    }

    // ── Transaction Safety ────────────────────────────────

    public function test_store_rolls_back_on_passenger_creation_failure(): void
    {
        Sanctum::actingAs($this->user);

        // Passenger without required full_name should fail
        $payload = [
            'departure_location' => 'Yangon',
            'destination' => 'Bangkok',
            'travel_date' => '2026-08-20',
            'contact_name' => 'U Aung Min',
            'contact_phone' => '09123456789',
            'passengers' => [
                ['nrc_number' => '12/ABC(N)123456'],
            ],
        ];

        $this->postJson('/api/bookings', $payload)
            ->assertUnprocessable();

        // Booking should NOT be created
        $this->assertEquals(0, Booking::count());
        $this->assertEquals(0, Passenger::count());
    }
}
