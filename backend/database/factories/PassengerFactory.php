<?php

namespace Database\Factories;

use App\Models\Booking;
use Illuminate\Database\Eloquent\Factories\Factory;

class PassengerFactory extends Factory
{
    /**
     * Define the model's default state.
     *
     * @return array<string, mixed>
     */
    public function definition(): array
    {
        return [
            'booking_id' => Booking::factory(),
            'full_name' => $this->faker->name(),
            'nrc_number' => $this->faker->optional(0.7)->numerify('##/???(#) ######'),
            'date_of_birth' => $this->faker->optional(0.8)->dateTimeBetween('-60 years', '-18 years'),
            'phone_number' => $this->faker->optional(0.6)->numerify('09#########'),
            'passport_number' => $this->faker->optional(0.3)->lexify('??') . $this->faker->numerify('#######'),
            'ticket_number' => $this->faker->optional(0.4)->lexify('??') . $this->faker->numerify('##########'),
            'seat_number' => $this->faker->optional(0.5)->randomElement(['1A', '2B', '3C', '4D', '5E', '6F']),
        ];
    }
}
