<?php

namespace App\Http\Requests\Api;

use Illuminate\Foundation\Http\FormRequest;

class StoreBookingRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, mixed>
     */
    public function rules(): array
    {
        return [
            'pnr' => ['nullable', 'string', 'max:20'],
            'departure_location' => ['required', 'string', 'max:255'],
            'destination' => ['required', 'string', 'max:255'],
            'travel_date' => ['required', 'date'],
            'travel_time' => ['nullable', 'date_format:H:i'],
            'airline_name' => ['nullable', 'string', 'max:255'],
            'flight_number' => ['nullable', 'string', 'max:50'],
            'contact_name' => ['required', 'string', 'max:255'],
            'contact_phone' => ['required', 'string', 'max:20'],
            'deposit_amount' => ['nullable', 'numeric', 'min:0'],
            'total_amount' => ['nullable', 'numeric', 'min:0'],
            'status' => ['nullable', 'in:pending,confirmed,travelled,cancelled,refunded'],
            'comment' => ['nullable', 'string'],
            'passengers' => ['required', 'array', 'min:1'],
            'passengers.*.full_name' => ['required', 'string', 'max:255'],
            'passengers.*.nrc_number' => ['nullable', 'string', 'max:50'],
            'passengers.*.date_of_birth' => ['nullable', 'date'],
            'passengers.*.phone_number' => ['nullable', 'string', 'max:20'],
            'passengers.*.passport_number' => ['nullable', 'string', 'max:50'],
            'passengers.*.ticket_number' => ['nullable', 'string', 'max:50'],
            'passengers.*.seat_number' => ['nullable', 'string', 'max:10'],
        ];
    }
}
