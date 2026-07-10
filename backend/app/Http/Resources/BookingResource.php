<?php

namespace App\Http\Resources;

use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\JsonResource;

class BookingResource extends JsonResource
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
            'booking_code' => $this->booking_code,
            'pnr' => $this->pnr,
            'departure_location' => $this->departure_location,
            'destination' => $this->destination,
            'travel_date' => $this->travel_date->format('Y-m-d'),
            'travel_time' => $this->travel_time?->format('H:i'),
            'airline_name' => $this->airline_name,
            'flight_number' => $this->flight_number,
            'contact_name' => $this->contact_name,
            'contact_phone' => $this->contact_phone,
            'deposit_amount' => $this->deposit_amount,
            'total_amount' => $this->total_amount,
            'status' => $this->status,
            'comment' => $this->comment,
            'passengers_count' => $this->whenCounted('passengers'),
            'passengers' => PassengerResource::collection($this->whenLoaded('passengers')),
            'creator' => $this->whenLoaded('creator', function () {
                return [
                    'id' => $this->creator->id,
                    'name' => $this->creator->name,
                ];
            }),
            'created_at' => $this->created_at?->toIso8601String(),
            'updated_at' => $this->updated_at?->toIso8601String(),
        ];
    }
}
