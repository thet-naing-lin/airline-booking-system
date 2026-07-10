<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class AdminSeeder extends Seeder
{
    /**
     * Seed a default admin account for local development.
     */
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@airlinebooking.com'],
            [
                'name' => 'Xin',
                'password' => Hash::make('asdfasdf'),
                'role' => 'admin',
            ]
        );
    }
}
