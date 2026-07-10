<?php

namespace Database\Factories;

use App\Models\User;
use Illuminate\Database\Eloquent\Factories\Factory;

class BookingFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        $date = $this->faker->dateTimeBetween('+1 month', '+6 months');

        return [
            'booking_code' => 'BK-' . $date->format('Ymd') . '-' . str_pad($this->faker->unique()->numberBetween(1, 9999), 4, '0', STR_PAD_LEFT),
            'pnr' => $this->faker->optional(0.6)->lexify('????') . $this->faker->numerify('####'),
            'departure_location' => $this->faker->city(),
            'destination' => $this->faker->city(),
            'travel_date' => $date->format('Y-m-d'),
            'travel_time' => $this->faker->optional(0.7)->time('H:i'),
            'airline_name' => $this->faker->optional(0.5)->company(),
            'flight_number' => $this->faker->optional(0.5)->lexify('??') . $this->faker->numerify('###'),
            'contact_name' => $this->faker->name(),
            'contact_phone' => $this->faker->numerify('09#########'),
            'deposit_amount' => $this->faker->randomFloat(2, 0, 500000),
            'total_amount' => $this->faker->randomFloat(2, 100000, 2000000),
            'status' => 'pending',
            'comment' => $this->faker->optional(0.3)->sentence(),
            'created_by' => User::factory(),
        ];
    }

    public function deposite(): static
    {
        return $this->state(fn(array $attributes) => ['status' => 'deposite']);
    }

    public function paid(): static
    {
        return $this->state(fn(array $attributes) => ['status' => 'paid']);
    }

    public function travelled(): static
    {
        return $this->state(fn(array $attributes) => ['status' => 'travelled']);
    }

    public function cancelled(): static
    {
        return $this->state(fn(array $attributes) => ['status' => 'cancelled']);
    }

    public function refunded(): static
    {
        return $this->state(fn(array $attributes) => ['status' => 'refunded']);
    }
}
