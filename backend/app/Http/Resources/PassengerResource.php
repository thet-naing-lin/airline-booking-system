<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class PassengerResource extends JsonResource
{
    /**
     * Transform the resource into an array.
     *
     * @return array<string, mixed>
     */
    public function toArray(Request $request): array
    {
        return [
            'id' => $this->id,
            'full_name' => $this->full_name,
            'nrc_number' => $this->nrc_number,
            'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
            'phone_number' => $this->phone_number,
            'passport_number' => $this->passport_number,
            'ticket_number' => $this->ticket_number,
            'seat_number' => $this->seat_number,
        ];
    }
}
