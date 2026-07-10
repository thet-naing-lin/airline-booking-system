<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

class Booking extends Model
{
    use HasFactory;
    /**
     * The attributes that are mass assignable.
     */
    protected $fillable = [
        'booking_code',
        'pnr',
        'departure_location',
        'destination',
        'travel_date',
        'travel_time',
        'airline_name',
        'flight_number',
        'contact_name',
        'contact_phone',
        'deposit_amount',
        'total_amount',
        'status',
        'comment',
        'created_by',
    ];

    /**
     * Get the attributes that should be cast.
     */
    protected function casts(): array
    {
        return [
            'travel_date' => 'date',
            'travel_time' => 'datetime:H:i',
            'deposit_amount' => 'decimal:2',
            'total_amount' => 'decimal:2',
        ];
    }

    /**
     * The user who created this booking.
     */
    public function creator(): BelongsTo
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    /**
     * The passengers on this booking.
     */
    public function passengers(): HasMany
    {
        return $this->hasMany(Passenger::class);
    }
}
