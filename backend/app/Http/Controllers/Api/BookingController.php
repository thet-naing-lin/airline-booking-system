<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Http\Requests\Api\StoreBookingRequest;
use App\Http\Requests\Api\UpdateBookingRequest;
use App\Http\Requests\Api\UpdateBookingStatusRequest;
use App\Http\Resources\BookingResource;
use App\Models\Booking;
use App\Services\BookingService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Http\Resources\Json\AnonymousResourceCollection;

class BookingController extends Controller
{
    public function __construct(
        private readonly BookingService $bookingService
    ) {}

    /**
     * Paginated list of bookings with search and filters.
     */
    public function index(Request $request): AnonymousResourceCollection
    {
        $query = Booking::withCount('passengers');

        // Search across multiple fields
        if ($search = $request->input('search')) {
            $query->where(function ($q) use ($search) {
                $q->where('booking_code', 'like', "%{$search}%")
                    ->orWhere('pnr', 'like', "%{$search}%")
                    ->orWhere('contact_name', 'like', "%{$search}%")
                    ->orWhere('contact_phone', 'like', "%{$search}%")
                    ->orWhereHas('passengers', function ($pq) use ($search) {
                        $pq->where('full_name', 'like', "%{$search}%")
                            ->orWhere('nrc_number', 'like', "%{$search}%")
                            ->orWhere('phone_number', 'like', "%{$search}%");
                    });
            });
        }

        // Status filter
        if ($status = $request->input('status')) {
            $query->where('status', $status);
        }

        // Travel date filter
        if ($travelDate = $request->input('travel_date')) {
            $query->whereDate('travel_date', $travelDate);
        }

        // Departure location filter
        if ($departure = $request->input('departure_location')) {
            $query->where('departure_location', $departure);
        }

        // Destination filter
        if ($destination = $request->input('destination')) {
            $query->where('destination', $destination);
        }

        $perPage = min($request->input('per_page', 20), 100);
        $bookings = $query->orderByDesc('created_at')->paginate($perPage);

        return BookingResource::collection($bookings);
    }

    /**
     * Create a booking with passengers inside a DB transaction.
     */
    public function store(StoreBookingRequest $request): JsonResponse
    {
        $booking = $this->bookingService->create(
            $request->validated(),
            $request->user()->id
        );

        return response()->json([
            'message' => 'Booking created',
            'data' => new BookingResource($booking),
        ], 201);
    }

    /**
     * Show a booking with its passengers.
     */
    public function show(Booking $booking): JsonResponse
    {
        $booking->load(['passengers', 'creator']);

        return response()->json([
            'data' => new BookingResource($booking),
        ]);
    }

    /**
     * Update a booking and its passengers inside a DB transaction.
     */
    public function update(UpdateBookingRequest $request, Booking $booking): JsonResponse
    {
        $booking = $this->bookingService->update($booking, $request->validated());

        return response()->json([
            'message' => 'Booking updated',
            'data' => new BookingResource($booking),
        ]);
    }

    /**
     * Update booking status.
     */
    public function updateStatus(UpdateBookingStatusRequest $request, Booking $booking): JsonResponse
    {
        $booking->update(['status' => $request->input('status')]);

        return response()->json([
            'message' => 'Status updated',
            'data' => new BookingResource($booking->fresh()),
        ]);
    }
}
