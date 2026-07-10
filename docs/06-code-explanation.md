# Code Explanation — Task 1 to Task 8 + Post-MVP Updates

This document provides a line-by-line explanation of every code change made in Tasks 1-8 and post-MVP updates, including the reasoning behind each decision.

---

## Task 1 — Initialize Repository

### Goal
Create a clean monorepo with Laravel API backend and React frontend.

### Files Created

#### `backend/` — Laravel Project

Created via:
```bash
composer create-project laravel/laravel backend
```

**What it does:** Scaffolds a complete Laravel 13 application with:
- `app/` — Application logic (Models, Controllers, etc.)
- `config/` — Configuration files
- `database/` — Migrations, seeders, factories
- `routes/` — Route definitions
- `public/` — Entry point for web server
- `vendor/` — Composer dependencies (gitignored)
- `.env` — Environment variables (gitignored)
- `.env.example` — Template for `.env` (committed)

**Why Laravel 13:** Latest stable version with PHP 8.4 support, Sanctum 4.x, and modern bootstrap approach.

---

#### `frontend/` — React + Vite Project

Created via:
```bash
npm create vite@latest frontend -- --template react
```

**What it does:** Scaffolds a React application with:
- `src/` — Source code
- `public/` — Static assets
- `vite.config.js` — Vite configuration
- `package.json` — NPM dependencies

**Why Vite:** Fast development server, hot module replacement, optimized builds.

---

#### Tailwind CSS Setup

```bash
cd frontend && npm install -D tailwindcss @tailwindcss/vite
```

**What it does:** Installs Tailwind CSS v4 with the Vite plugin.

**Why Tailwind CSS v4:** New version uses Vite plugin instead of PostCSS, simpler setup.

**File:** `frontend/vite.config.js`
```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Why:** Adds Tailwind CSS to Vite's build process.

**File:** `frontend/src/index.css`
```css
@import "tailwindcss";
```

**Why:** Imports Tailwind's base styles. This replaces all default CSS with Tailwind utilities.

---

#### `README.md` — Updated

Added setup instructions for both backend and frontend:

**Why:** Task 1 acceptance criteria requires "Root README explains commands."

---

## Task 2 — Backend Foundation

### Goal
Database and authentication baseline with MySQL and Sanctum.

### Files Modified

#### `.env` — Database Configuration

```env
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=airline_booking
DB_USERNAME=root
DB_PASSWORD=
```

**Why:**
- `DB_CONNECTION=mysql` — Production uses MySQL, not SQLite
- `DB_DATABASE=airline_booking` — Descriptive name for the project
- `DB_USERNAME=root` — Local development default

```env
SESSION_DRIVER=cookie
```

**Why:** Sanctum's SPA authentication mode uses cookies. Database sessions require extra setup.

```env
SANCTUM_STATEFUL_DOMAINS=localhost:5173
```

**Why:** Tells Sanctum which domains are "first-party" (the React app on Vite's dev port). Without this, cookie-based auth won't work cross-origin.

---

#### `.env.example` — Template

Same changes as `.env` but without the actual values. This is committed to git so other developers know what environment variables are needed.

---

### Files Created

#### Sanctum Installation

```bash
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
```

**What it does:**
1. Installs Sanctum package (adds to `composer.json`)
2. Publishes `config/sanctum.php` and migration files

**Why Sanctum (not Passport or JWT):**
- Our frontend is a first-party SPA
- Sanctum's token mode is simpler than OAuth
- No external services needed

**File:** `config/sanctum.php`
```php
return [
    'stateful' => explode(',', env('SANCTUM_STATEFUL_DOMAINS', sprintf(
        '%s%s',
        'localhost,localhost:3000,localhost:8080,127.0.0.1,127.0.0.1:8000,::1',
        env('APP_URL') ? ','.parse_url(env('APP_URL'), PHP_URL_HOST) : ''
    ))),
    // ...
];
```

**Why:** Defines which domains can use cookie-based auth. Our `SANCTUM_STATEFUL_DOMAINS` adds `localhost:5173`.

---

#### Migration: `create_personal_access_tokens_table.php`

```php
Schema::create('personal_access_tokens', function (Blueprint $table) {
    $table->id();
    $table->morphs('tokenable'); // tokenable_type, tokenable_id
    $table->string('name');
    $table->string('token', 64)->unique();
    $table->text('abilities')->nullable();
    $table->timestamp('last_used_at')->nullable();
    $table->timestamp('expires_at')->nullable();
    $table->timestamps();
});
```

**Why:**
- `morphs('tokenable')` — Polymorphic relation. Any model (User, etc.) can have tokens
- `token` — The actual token hash (64 chars, unique)
- `abilities` — JSON array of permissions (e.g., `["*"]` for all)
- `last_used_at` — Tracks when token was last used
- `expires_at` — Optional expiration

---

### Files Modified

#### `app/Models/User.php`

```php
use Laravel\Sanctum\HasApiTokens;
```

**Why:** Adds `createToken()`, `tokens()`, and `currentAccessToken()` methods to User.

```php
use HasApiTokens, HasFactory, Notifiable;
```

**Why:** `HasApiTokens` must be the first trait (or at least included) for Sanctum to work.

```php
#[Fillable(['name', 'email', 'password', 'role'])]
```

**Why:** Adds `role` to mass-assignable fields. Without this, `User::create(['role' => 'admin'])` would be silently ignored.

```php
'role' => 'string',
```

**Why:** Ensures the role is always a string in PHP, not treated as null or numeric.

---

#### Migration: `add_role_to_users_table.php`

```php
$table->string('role')->default('staff')->after('email');
```

**Why:**
- `string` — Not `enum` because MySQL `enum` is hard to modify later
- `default('staff')` — New users are staff by default
- `after('email')` — Places column logically near identity fields

```php
$table->dropColumn('role');
```

**Why:** The `down()` method reverses the migration. `migrate:rollback` removes the column.

---

### Files Created

#### `routes/api.php`

```php
Route::post('/auth/login', [AuthController::class, 'login'])->name('login');

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/auth/logout', [AuthController::class, 'logout']);
    Route::get('/auth/me', [AuthController::class, 'me']);
});
```

**Why:**
- `login` is public (no middleware) — you need it to get a token
- `logout` and `me` require `auth:sanctum` — they need a valid token
- `->name('login')` — Named route prevents "Route [login] not defined" error

---

#### `app/Http/Controllers/Api/AuthController.php`

```php
public function login(Request $request): JsonResponse
{
    $credentials = $request->validate([
        'email' => 'required|email',
        'password' => 'required',
    ]);

    if (!Auth::attempt($credentials)) {
        return response()->json(['message' => 'Invalid credentials'], 401);
    }

    /** @var \App\Models\User $user */
    $user = Auth::user();
    $token = $user->createToken('auth-token')->plainTextToken;

    return response()->json([
        'data' => [
            'user' => $user,
            'token' => $token,
        ],
    ]);
}
```

**Line-by-line:**
- `$request->validate()` — Validates input before checking credentials
- `Auth::attempt($credentials)` — Checks email+password against `users` table
- Returns 401 if credentials are wrong
- `Auth::user()` — Gets the authenticated user
- `createToken('auth-token')` — Creates a Sanctum token, stores hash in `personal_access_tokens`
- `plainTextToken` — Returns the full token (e.g., `1|abc123...`) to store client-side

```php
public function logout(Request $request): JsonResponse
{
    $request->user()->currentAccessToken()->delete();

    return response()->json(['message' => 'Logged out']);
}
```

**Why:**
- `currentAccessToken()` — Gets the token used for this request
- `delete()` — Revokes only this token, not all tokens

```php
public function me(Request $request): JsonResponse
{
    return response()->json(['data' => $request->user()]);
}
```

**Why:** Returns the authenticated user. `$request->user()` is idiomatic Laravel.

---

#### `bootstrap/app.php`

```php
->withRouting(
    web: __DIR__.'/../routes/web.php',
    api: __DIR__.'/../routes/api.php',  // Added
    commands: __DIR__.'/../routes/console.php',
    health: '/up',
)
```

**Why:** Laravel 13 removed `RouteServiceProvider`. The `api` parameter automatically applies the `/api` prefix to all routes in `api.php`.

---

### Files Created

#### `database/seeders/AdminSeeder.php`

```php
User::firstOrCreate(
    ['email' => 'admin@example.com'],
    [
        'name' => 'Admin',
        'password' => Hash::make('password'),
        'role' => 'admin',
    ]
);
```

**Why:**
- `firstOrCreate` — Doesn't fail if admin already exists (idempotent)
- `Hash::make('password')` — Bcrypt-hashes the password. Never store plaintext
- `role => 'admin'` — Seed user has admin privileges

---

#### `database/seeders/DatabaseSeeder.php`

```php
$this->call([
    AdminSeeder::class,
]);
```

**Why:** Runs the admin seeder when you run `php artisan db:seed`.

---

## Task 3 — Booking Database

### Goal
Implement bookings and passengers migrations, models, and relationships.

### Files Created

#### Migration: `create_bookings_table.php`

```php
$table->id();
```
**Why:** Auto-incrementing bigint primary key.

```php
$table->string('booking_code')->unique();
```
**Why:** Internal reference like `BK-20260710-0001`. `unique()` prevents duplicates.

```php
$table->string('pnr', 20)->nullable()->index();
```
**Why:**
- `string('pnr', 20)` — Max 20 chars (airline PNRs are usually 6 chars)
- `nullable()` — PNR is empty when booking is pending
- `index()` — PNR is a search field in the API

```php
$table->string('departure_location');
$table->string('destination');
$table->date('travel_date');
$table->time('travel_time')->nullable();
```
**Why:** Core itinerary fields. `travel_time` is nullable because not all bookings have a specific time.

```php
$table->string('airline_name')->nullable();
$table->string('flight_number')->nullable();
```
**Why:** Optional in MVP. Some bookings are pending airline assignment.

```php
$table->string('contact_name');
$table->string('contact_phone');
```
**Why:** The customer/payer. Required — every booking needs a contact.

```php
$table->decimal('deposit_amount', 12, 2)->default(0);
$table->decimal('total_amount', 12, 2)->default(0);
```
**Why:**
- `decimal(12,2)` — Domain Rule #8: "Store money as decimal(12,2), never float"
- `default(0)` — New bookings start with zero amounts
- `12,2` — Supports up to 9,999,999,999.99

```php
$table->string('status')->default('pending');
```
**Why:**
- `string` not `enum` — MySQL `enum` is hard to modify later
- `default('pending')` — Domain Rule #4: new bookings start as pending

```php
$table->text('comment')->nullable();
```
**Why:** Internal notes. `text` not `string` because comments can be long.

```php
$table->foreignId('created_by')->constrained('users');
```
**Why:**
- `foreignId('created_by')` — Adds `created_by` column with foreign key
- `constrained('users')` — Enforces referential integrity at DB level

---

#### Migration: `create_passengers_table.php`

```php
$table->foreignId('booking_id')->constrained()->cascadeOnDelete();
```
**Why:**
- `foreignId('booking_id')` — Each passenger belongs to one booking
- `constrained()` — Foreign key to `bookings` table
- `cascadeOnDelete()` — Delete booking → delete its passengers

```php
$table->string('full_name');
```
**Why:** Required passenger name.

```php
$table->string('nrc_number')->nullable();
```
**Why:** Myanmar national identity card. Nullable because foreign passengers won't have one.

```php
$table->date('date_of_birth')->nullable();
```
**Why:** Schema doc says "optional initially; required according to business rule later."

```php
$table->string('phone_number')->nullable();
$table->string('passport_number')->nullable();
```
**Why:** Optional per passenger (not per booking contact).

```php
$table->string('ticket_number')->nullable()->index();
```
**Why:**
- `index()` — Ticket number is a search field
- Individual to each passenger (Domain Rule #5)

```php
$table->string('seat_number')->nullable();
```
**Why:** Individual to each passenger (Domain Rule #5).

---

### Files Created

#### `app/Models/Booking.php`

```php
use HasFactory;
```
**Why:** Enables `Booking::factory()` for tests and seeders.

```php
protected $fillable = [
    'booking_code',
    'pnr',
    // ... all fields
];
```
**Why:** Mass-assignment protection. Only these fields can be passed to `create()` or `update()`.

```php
'travel_date' => 'date',
```
**Why:** Auto-converts string `"2026-08-15"` to Carbon instance.

```php
'travel_time' => 'datetime:H:i',
```
**Why:** Casts time strings to proper time objects.

```php
'deposit_amount' => 'decimal:2',
'total_amount' => 'decimal:2',
```
**Why:** Always returns strings like `"50000.00"` instead of floats. Prevents floating-point precision errors with money.

```php
public function creator(): BelongsTo
{
    return $this->belongsTo(User::class, 'created_by');
}
```
**Why:**
- `belongsTo(User::class, 'created_by')` — Foreign key is `created_by`, not default `user_id`
- Enables `$booking->creator` to get the staff user who created it

```php
public function passengers(): HasMany
{
    return $this->hasMany(Passenger::class);
}
```
**Why:** Enables `$booking->passengers` collection and `->passengers()->count()`.

---

#### `app/Models/Passenger.php`

```php
use HasFactory;
```
**Why:** Enables `Passenger::factory()`.

```php
protected $fillable = [
    'booking_id',
    'full_name',
    // ... all fields
];
```
**Why:** Mass-assignment protection.

```php
'date_of_birth' => 'date',
```
**Why:** Auto-converts to Carbon.

```php
public function booking(): BelongsTo
{
    return $this->belongsTo(Booking::class);
}
```
**Why:** Enables `$passenger->booking` to get the parent booking.

---

### Files Created

#### `database/factories/BookingFactory.php`

```php
'booking_code' => 'BK-' . $date->format('Ymd') . '-' . str_pad($this->faker->unique()->numberBetween(1, 9999), 4, '0', STR_PAD_LEFT),
```
**Why:** Generates codes like `BK-20260815-0001`. `unique()` prevents collisions in tests.

```php
'pnr' => $this->faker->optional(0.6)->lexify('????') . $this->faker->numerify('####'),
```
**Why:** 60% chance of having a PNR (simulates pending bookings without PNR).

```php
'deposit_amount' => $this->faker->randomFloat(2, 0, 500000),
'total_amount' => $this->faker->randomFloat(2, 100000, 2000000),
```
**Why:** Realistic ranges. Total is always ≥ 100,000.

```php
public function confirmed(): static
{
    return $this->state(fn (array $attributes) => ['status' => 'confirmed']);
}
```
**Why:** State methods let you do `Booking::factory()->confirmed()->create()`.

---

#### `database/factories/PassengerFactory.php`

```php
'booking_id' => Booking::factory(),
```
**Why:** Each passenger defaults to creating a new booking. But in practice, you use `Booking::factory()->hasPassengers(3)`.

---

### Files Created

#### `tests/Feature/BookingMigrationTest.php`

```php
use RefreshDatabase;
```
**Why:** Each test runs in a fresh DB. No test pollutes another's data.

```php
$this->assertTrue(
    \Schema::hasColumn('bookings', $column),
    "Bookings table missing column: {$column}"
);
```
**Why:** Verifies every expected column exists. If someone removes a column, this test fails.

```php
$this->expectException(\Illuminate\Database\QueryException::class);
Booking::factory()->create(['booking_code' => 'BK-20260710-0001']);
Booking::factory()->create(['booking_code' => 'BK-20260710-0001']);
```
**Why:** Tests that `booking_code` is actually unique.

```php
$this->assertDatabaseHas('bookings', [
    'deposit_amount' => 123456.78,
]);
```
**Why:** Verifies decimal precision is preserved.

```php
$booking->delete();
$this->assertEquals(0, Passenger::where('booking_id', $booking->id)->count());
```
**Why:** Tests cascade delete.

---

#### `tests/Feature/BookingRelationshipTest.php`

```php
$this->assertEquals($user->id, $booking->creator->id);
```
**Why:** Verifies `creator()` relationship works.

```php
$bookingWithCount = Booking::withCount('passengers')->find($booking->id);
$this->assertEquals(5, $bookingWithCount->passengers_count);
```
**Why:** Domain Rule #1: "Never manually persist passenger_count; calculate it with `withCount('passengers')`."

```php
$this->assertInstanceOf(\Illuminate\Support\Carbon::class, $booking->travel_date);
```
**Why:** Verifies the `date` cast converts to Carbon.

```php
$this->assertIsString($booking->deposit_amount);
$this->assertEquals('50000.00', $booking->deposit_amount);
```
**Why:** Verifies `decimal:2` cast returns a string, not a float.

---

## Task 4 — Booking API

### Goal
Full API for booking lifecycle.

### Files Created

#### `app/Http/Requests/Api/StoreBookingRequest.php`

```php
public function authorize(): bool
{
    return true;
}
```
**Why:** Allows any authenticated user. Authorization is handled by `auth:sanctum` middleware.

```php
'departure_location' => ['required', 'string', 'max:255'],
'destination' => ['required', 'string', 'max:255'],
'travel_date' => ['required', 'date'],
'contact_name' => ['required', 'string', 'max:255'],
'contact_phone' => ['required', 'string', 'max:20'],
```
**Why:** Required per `docs/02-database-schema.md`.

```php
'pnr' => ['nullable', 'string', 'max:20'],
```
**Why:** Domain Rule #3: "PNR may be empty while status is pending."

```php
'deposit_amount' => ['nullable', 'numeric', 'min:0'],
'total_amount' => ['nullable', 'numeric', 'min:0'],
```
**Why:** Money fields. `numeric` ensures it's a number, `min:0` prevents negative amounts.

```php
'status' => ['nullable', 'in:pending,confirmed,travelled,cancelled,refunded'],
```
**Why:** Domain Rule #4: only these five statuses are valid.

```php
'passengers' => ['required', 'array', 'min:1'],
```
**Why:** Domain Rule: "Require at least one passenger when a booking is created."

```php
'passengers.*.full_name' => ['required', 'string', 'max:255'],
```
**Why:** Each passenger must have a name. The `*` wildcard validates every item in the array.

---

#### `app/Http/Requests/Api/UpdateBookingRequest.php`

Same as `StoreBookingRequest` but adds:

```php
'passengers.*.id' => ['nullable', 'integer'],
```
**Why:** When updating, existing passengers have an `id`. New passengers don't.

---

#### `app/Http/Requests/Api/UpdateBookingStatusRequest.php`

```php
'status' => ['required', 'in:pending,confirmed,travelled,cancelled,refunded'],
```
**Why:** Only validates status. The controller handles transition logic later.

---

### Files Created

#### `app/Http/Resources/PassengerResource.php`

```php
'date_of_birth' => $this->date_of_birth?->format('Y-m-d'),
```
**Why:** The `?->` null-safe operator handles passengers without a DOB.

---

#### `app/Http/Resources/BookingResource.php`

```php
'passengers_count' => $this->whenCounted('passengers'),
```
**Why:** Domain Rule #1: "Never manually persist passenger_count; calculate it with `withCount('passengers')`."

```php
'passengers' => PassengerResource::collection($this->whenLoaded('passengers')),
```
**Why:** `whenLoaded` only includes passengers if the relationship was eager-loaded.

```php
'creator' => $this->whenLoaded('creator', function () {
    return [
        'id' => $this->creator->id,
        'name' => $this->creator->name,
    ];
}),
```
**Why:** Returns only `id` and `name` — not the full user object.

---

### Files Created

#### `app/Services/BookingService.php`

```php
return DB::transaction(function () use ($data, $createdBy) {
```
**Why:** Domain Rule #7: "Use database transactions whenever creating/updating a booking together with passengers."

```php
$booking = Booking::create([
    'booking_code' => $this->generateBookingCode(),
    ...
]);
```
**Why:** `generateBookingCode()` creates a unique code like `BK-20260710-0001`.

```php
$booking->passengers()->createMany($data['passengers']);
```
**Why:** `createMany` inserts all passengers in one query.

```php
return $booking->loadCount('passengers')->load('passengers');
```
**Why:** `loadCount` adds `passengers_count`. `load` eager-loads passengers.

---

#### Update Method — Passenger Sync Logic:

```php
$existingIds = collect($data['passengers'])
    ->pluck('id')
    ->filter()
    ->toArray();
```
**Why:** Collects IDs of passengers being kept. `filter()` removes nulls.

```php
$booking->passengers()
    ->whereNotIn('id', $existingIds)
    ->delete();
```
**Why:** Removes passengers not in the update request.

```php
foreach ($data['passengers'] as $passengerData) {
    if (!empty($passengerData['id'])) {
        $booking->passengers()
            ->where('id', $passengerData['id'])
            ->update(collect($passengerData)->except('id')->toArray());
    } else {
        $booking->passengers()->create($passengerData);
    }
}
```
**Why:** Two paths:
- Has `id` → update existing passenger
- No `id` → create new passenger

---

#### Booking Code Generator:

```php
private function generateBookingCode(): string
{
    $date = now()->format('Ymd');
    $lastBooking = Booking::where('booking_code', 'like', "BK-{$date}-%")
        ->orderByDesc('booking_code')
        ->first();

    if ($lastBooking) {
        $lastNumber = (int) substr($lastBooking->booking_code, -4);
        $nextNumber = $lastNumber + 1;
    } else {
        $nextNumber = 1;
    }

    return 'BK-' . $date . '-' . str_pad($nextNumber, 4, '0', STR_PAD_LEFT);
}
```
**Why:** Generates `BK-20260710-0001`, `BK-20260710-0002`, etc. Resets daily.

---

### Files Created

#### `app/Http/Controllers/Api/BookingController.php`

```php
public function __construct(
    private readonly BookingService $bookingService
) {}
```
**Why:** Dependency injection. The controller doesn't create the service — it receives it.

---

#### Index Method:

```php
$query = Booking::withCount('passengers');
```
**Why:** Loads `passengers_count` on every booking.

```php
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
```
**Why:** API contract says search covers: booking code, PNR, contact name/phone, passenger name/NRC/phone.

```php
$perPage = min($request->input('per_page', 20), 100);
```
**Why:** Conventions: "Paginate index endpoints; default 20, max 100."

---

#### Store Method:

```php
$booking = $this->bookingService->create(
    $request->validated(),
    $request->user()->id
);
```
**Why:** Passes only validated data. `$request->user()->id` is the authenticated staff member.

```php
return response()->json([
    'message' => 'Booking created',
    'data' => new BookingResource($booking),
], 201);
```
**Why:** Conventions: "Return consistent JSON: `{ message, data }`."

---

#### Update Method:

```php
$booking = $this->bookingService->update($booking, $request->validated());
```
**Why:** Route model binding gives us the `$booking` automatically.

---

#### Update Status:

```php
$booking->update(['status' => $request->input('status')]);
```
**Why:** Simple status change. Validation ensures only valid statuses are passed.

---

### Files Modified

#### `routes/api.php`

```php
Route::apiResource('bookings', BookingController::class);
```
**Why:** Creates all 7 RESTful routes in one line.

```php
Route::patch('bookings/{booking}/status', [BookingController::class, 'updateStatus'])
    ->name('bookings.update-status');
```
**Why:** Custom endpoint for status change. `PATCH` because it's a partial update.

```php
Route::middleware('auth:sanctum')->group(function () {
```
**Why:** All booking routes require authentication.

---

### Files Created

#### `tests/Feature/BookingApiTest.php`

```php
use RefreshDatabase;
```
**Why:** Each test starts with a clean database.

```php
protected function setUp(): void
{
    parent::setUp();
    $this->user = User::factory()->create(['role' => 'staff']);
}
```
**Why:** Creates a fresh user for each test.

```php
Sanctum::actingAs($this->user);
```
**Why:** Simulates an authenticated request without calling the login endpoint.

---

#### Test Categories:

| Category | Tests | What they verify |
|---|---|---|
| Index | 5 | Pagination, `passengers_count`, search, per_page |
| Filters | 2 | Status filter, travel date filter |
| Store | 5 | Creates booking + passengers, unique code, required fields |
| Show | 2 | Returns booking with passengers, 404 for nonexistent |
| Update | 3 | Modifies booking + passengers, removes passengers |
| Status | 2 | Changes status, rejects invalid status |
| Transaction | 1 | Rolls back on failure |
| Auth | 1 | Returns 401 without token |

---

## Summary of Domain Rules Enforced

| Rule | How enforced |
|---|---|
| 1. No persisted `passenger_count` | `withCount` tested, no column created |
| 2. One shared itinerary/contact/financial | Single `bookings` table |
| 3. PNR on bookings, nullable | `pnr` column on bookings, `nullable()` |
| 4. Five valid statuses only | Status `in:` rule in Form Requests |
| 5. Ticket/seat per passenger | Columns on `passengers`, not `bookings` |
| 6. Contact ≠ passenger | `contact_*` on bookings, separate from passengers |
| 7. DB transactions | `DB::transaction()` in BookingService |
| 8. Money as decimal(12,2) | `decimal(12,2)` migration, tested |
| 9. Validate every API input | Form Requests for all endpoints |

---

## Task 5 — Frontend Foundation

### Goal
React application shell and API connection.

### Dependencies Installed

```bash
npm install react-router-dom axios
```

**Why:**
- `react-router-dom` — Client-side routing for SPA navigation
- `axios` — HTTP client for API calls with interceptors

---

### Files Created

#### `frontend/.env.example`

```env
VITE_API_URL=http://localhost:8000/api
```

**Why:** Template for the backend API URL. Vite reads `VITE_*` variables and makes them available in `import.meta.env`.

---

#### `src/lib/api.js`

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});
```

**Why:**
- `axios.create()` — Creates a reusable axios instance with base config
- `baseURL` — Reads from `.env`, falls back to localhost
- `Accept: application/json` — Ensures Laravel returns JSON errors, not redirects

```javascript
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
```

**Why:**
- Request interceptor runs before every API call
- Automatically attaches the Bearer token from localStorage
- No need to remember to add the header manually

```javascript
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);
```

**Why:**
- Response interceptor catches errors globally
- On 401 (Unauthorized), clears stored token and redirects to login
- Handles expired/revoked tokens automatically

---

#### `src/context/AuthContext.jsx`

```javascript
import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/api';

const AuthContext = createContext(null);
```

**Why:** Creates a React Context to share auth state across all components.

```javascript
export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('user');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);
```

**Why:**
- Lazy initialization reads from localStorage on first render
- `loading` state prevents flash of login page while checking token

```javascript
useEffect(() => {
  const token = localStorage.getItem('token');
  if (!token) {
    setLoading(false);
    return;
  }

  api.get('/auth/me')
    .then((response) => {
      setUser(response.data.data);
      localStorage.setItem('user', JSON.stringify(response.data.data));
    })
    .catch(() => {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      setUser(null);
    })
    .finally(() => {
      setLoading(false);
    });
}, []);
```

**Why:**
- On app load, checks if the stored token is still valid
- Calls `/auth/me` to verify the token
- If invalid, clears storage and sets user to null
- `loading` becomes false after check completes

```javascript
const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  const { user: userData, token } = response.data.data;

  localStorage.setItem('token', token);
  localStorage.setItem('user', JSON.stringify(userData));
  setUser(userData);

  return userData;
};
```

**Why:**
- Calls the login API
- Stores both token and user in localStorage
- Updates React state so components re-render

```javascript
const logout = async () => {
  try {
    await api.post('/auth/logout');
  } catch {
    // Token might already be invalid
  } finally {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  }
};
```

**Why:**
- Calls logout API to revoke the token on server
- Clears local storage regardless of API success
- `try/catch` handles case where token is already invalid

```javascript
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
```

**Why:** Custom hook with error handling. Prevents using auth outside the provider.

---

#### `src/pages/LoginPage.jsx`

```javascript
const [email, setEmail] = useState('');
const [password, setPassword] = useState('');
const [error, setError] = useState('');
const [loading, setLoading] = useState(false);
const { login } = useAuth();
const navigate = useNavigate();
```

**Why:** Controlled form state. `loading` prevents double-submit. `error` displays API errors.

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setError('');
  setLoading(true);

  try {
    await login(email, password);
    navigate('/');
  } catch (err) {
    const message = err.response?.data?.message || 'Login failed. Please try again.';
    setError(message);
  } finally {
    setLoading(false);
  }
};
```

**Why:**
- `e.preventDefault()` — Prevents page reload
- Calls `login()` from AuthContext
- On success, navigates to home page
- On failure, displays the API error message
- `finally` ensures loading state is reset

```jsx
<input
  id="email"
  type="email"
  value={email}
  onChange={(e) => setEmail(e.target.value)}
  required
  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
  placeholder="admin@example.com"
/>
```

**Why:**
- Controlled input with `value` and `onChange`
- `required` for HTML5 validation
- Tailwind classes for styling

---

#### `src/pages/DashboardPage.jsx`

```javascript
const { user } = useAuth();

return (
  <div>
    <h1 className="text-2xl font-bold text-gray-800 mb-4">Dashboard</h1>
    <p className="text-gray-600">
      Welcome back, <span className="font-medium">{user?.name}</span>.
    </p>
    <div className="mt-6 bg-white rounded-lg shadow p-6">
      <p className="text-gray-500">Booking list will be displayed here (Task 6).</p>
    </div>
  </div>
);
```

**Why:** Placeholder page. Shows the logged-in user's name. Will be replaced in Task 6.

---

#### `src/components/Layout.jsx`

```javascript
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navigation = [
  { name: 'Dashboard', href: '/' },
  { name: 'Bookings', href: '/bookings' },
];
```

**Why:** Navigation items defined as data. Easy to add/remove/modify.

```javascript
export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
```

**Why:** `useLocation()` gets the current path for active link highlighting.

```jsx
<aside className="fixed inset-y-0 left-0 w-64 bg-gray-800 text-white flex flex-col">
```

**Why:** Fixed sidebar on the left. 64 = 16rem = 256px wide.

```jsx
{navigation.map((item) => (
  <Link
    key={item.href}
    to={item.href}
    className={`block px-3 py-2 rounded-md text-sm font-medium ${
      location.pathname === item.href
        ? 'bg-gray-700 text-white'
        : 'text-gray-300 hover:bg-gray-700 hover:text-white'
    }`}
  >
    {item.name}
  </Link>
))}
```

**Why:**
- Maps navigation items to links
- Active link gets highlighted background
- `key` is required by React for lists

```jsx
<main className="ml-64 p-8">
  <Outlet />
</main>
```

**Why:**
- `ml-64` — Left margin matches sidebar width
- `<Outlet />` — Renders child routes (DashboardPage, etc.)

---

#### `src/components/ProtectedRoute.jsx`

```javascript
export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-500">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
```

**Why:**
- Shows loading while checking token
- Redirects to `/login` if not authenticated
- Renders children if authenticated
- `replace` prevents back-button from returning to protected page

---

#### `src/App.jsx`

```javascript
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import DashboardPage from './pages/DashboardPage';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          {/* Public route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<DashboardPage />} />
          </Route>

          {/* Catch all — redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
```

**Why:**
- `BrowserRouter` — Enables client-side routing
- `AuthProvider` — Wraps all routes so auth is available everywhere
- `/login` — Public route, no auth required
- `/` — Protected route with Layout wrapper
- `<Route index>` — Dashboard is the default child route
- `path="*"` — Catch-all redirects unknown paths to home

---

### Route Structure

```
/login        → LoginPage (public)
/             → ProtectedRoute → Layout
  / (index)   → DashboardPage
```

### Auth Flow

1. User visits any page
2. `AuthProvider` checks localStorage for token
3. If token exists, calls `/auth/me` to verify
4. If valid, user is set and page renders
5. If invalid, token is cleared and user sees login page
6. After login, token is stored and user is redirected to `/`

---

## Task 6 — Booking List

### Goal
Staff can find bookings.

### Files Created

#### `src/pages/BookingsPage.jsx`

```javascript
const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'confirmed', label: 'Confirmed' },
  { value: 'travelled', label: 'Travelled' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];
```

**Why:** Defines the status filter dropdown options. Empty value means "all".

```javascript
const STATUS_STYLES = {
  pending: 'bg-yellow-100 text-yellow-800',
  confirmed: 'bg-green-100 text-green-800',
  travelled: 'bg-blue-100 text-blue-800',
  cancelled: 'bg-red-100 text-red-800',
  refunded: 'bg-gray-100 text-gray-800',
};
```

**Why:** Color-coded status badges. Each status has a distinct color for quick visual identification.

```javascript
const [bookings, setBookings] = useState([]);
const [loading, setLoading] = useState(true);
const [pagination, setPagination] = useState({
  current_page: 1,
  last_page: 1,
  per_page: 20,
  total: 0,
});
```

**Why:**
- `bookings` — Array of booking objects from API
- `loading` — Shows loading state while fetching
- `pagination` — Tracks current page, last page, and total for pagination controls

```javascript
const [search, setSearch] = useState('');
const [status, setStatus] = useState('');
const [travelDate, setTravelDate] = useState('');
const [page, setPage] = useState(1);
```

**Why:** Filter state. Each filter is a separate state variable.

```javascript
useEffect(() => {
  fetchBookings();
}, [page, status, travelDate]);
```

**Why:** Re-fetches bookings when page, status, or travel date changes. Search is manual (button click) to avoid excessive API calls.

```javascript
const fetchBookings = async () => {
  setLoading(true);
  try {
    const params = {
      page,
      per_page: 20,
    };

    if (search) params.search = search;
    if (status) params.status = status;
    if (travelDate) params.travel_date = travelDate;

    const response = await api.get('/bookings', { params });
    setBookings(response.data.data);
    setPagination({
      current_page: response.data.current_page,
      last_page: response.data.last_page,
      per_page: response.data.per_page,
      total: response.data.total,
    });
  } catch (error) {
    console.error('Failed to fetch bookings:', error);
  } finally {
    setLoading(false);
  }
};
```

**Why:**
- Builds query params dynamically (only includes non-empty filters)
- Updates both bookings and pagination state from API response
- Handles errors gracefully

```javascript
const handleSearch = (e) => {
  e.preventDefault();
  setPage(1);
  fetchBookings();
};
```

**Why:** Search resets to page 1 (new search results might have different pages).

```javascript
const handleReset = () => {
  setSearch('');
  setStatus('');
  setTravelDate('');
  setPage(1);
};
```

**Why:** Clears all filters and resets to page 1.

---

#### Table Structure

```jsx
<table className="min-w-full divide-y divide-gray-200">
  <thead className="bg-gray-50">
    <tr>
      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
        Booking Code
      </th>
      {/* ... more columns */}
    </tr>
  </thead>
```

**Why:**
- `min-w-full` — Table fills available width
- `divide-y` — Horizontal lines between rows
- `bg-gray-50` — Light gray header background
- `uppercase tracking-wider` — Standard table header styling

```jsx
<td className="px-4 py-3 whitespace-nowrap">
  <Link
    to={`/bookings/${booking.id}`}
    className="text-blue-600 hover:text-blue-800 font-medium text-sm"
  >
    {booking.booking_code}
  </Link>
</td>
```

**Why:** Booking code is a link to the detail page (Task 8).

```jsx
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
  {booking.departure_location} → {booking.destination}
</td>
```

**Why:** Shows route as "Origin → Destination".

```jsx
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
  <div>{booking.contact_name}</div>
  <div className="text-xs text-gray-500">{booking.contact_phone}</div>
</td>
```

**Why:** Shows contact name and phone in two lines.

```jsx
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 text-center">
  {booking.passengers_count}
</td>
```

**Why:** Shows calculated passenger count (Domain Rule #1).

```jsx
<td className="px-4 py-3 whitespace-nowrap">
  <span
    className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${STATUS_STYLES[booking.status] || 'bg-gray-100 text-gray-800'}`}
  >
    {booking.status}
  </span>
</td>
```

**Why:** Status badge with color coding. `rounded-full` makes it pill-shaped.

```jsx
<td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
  {booking.pnr || '—'}
</td>
```

**Why:** Shows PNR or em-dash if null.

---

#### Pagination

```jsx
<div className="bg-gray-50 px-4 py-3 border-t border-gray-200 flex items-center justify-between">
  <div className="text-sm text-gray-700">
    Showing{' '}
    <span className="font-medium">
      {(pagination.current_page - 1) * pagination.per_page + 1}
    </span>{' '}
    to{' '}
    <span className="font-medium">
      {Math.min(pagination.current_page * pagination.per_page, pagination.total)}
    </span>{' '}
    of <span className="font-medium">{pagination.total}</span> bookings
  </div>
```

**Why:** Shows "Showing X to Y of Z bookings" text. Calculates from pagination state.

```jsx
  <div className="flex gap-2">
    <button
      onClick={() => setPage(page - 1)}
      disabled={page <= 1}
      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Previous
    </button>
    <span className="px-3 py-1 text-sm text-gray-700">
      Page {pagination.current_page} of {pagination.last_page}
    </span>
    <button
      onClick={() => setPage(page + 1)}
      disabled={page >= pagination.last_page}
      className="px-3 py-1 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      Next
    </button>
  </div>
```

**Why:**
- Previous/Next buttons with disabled states
- Shows "Page X of Y" text
- `disabled:opacity-50` — Grayed out when disabled
- `disabled:cursor-not-allowed` — No pointer cursor when disabled

---

### Files Modified

#### `src/App.jsx`

```javascript
import BookingsPage from './pages/BookingsPage';

// ...

<Route path="bookings" element={<BookingsPage />} />
```

**Why:** Adds the `/bookings` route inside the protected layout.

---

#### `src/components/Layout.jsx`

```javascript
location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
```

**Why:** Active link highlighting works for nested routes. `/bookings/1` still highlights "Bookings" link.

---

## Task 7 — Create and Edit Booking

### Goal
Staff can manage group bookings.

### Files Created

#### `src/pages/BookingFormPage.jsx`

```javascript
const EMPTY_PASSENGER = {
  full_name: '',
  nrc_number: '',
  date_of_birth: '',
  phone_number: '',
  passport_number: '',
  ticket_number: '',
  seat_number: '',
};
```

**Why:** Template for new passenger rows. All fields start empty.

```javascript
const INITIAL_FORM = {
  pnr: '',
  departure_location: '',
  destination: '',
  travel_date: '',
  travel_time: '',
  airline_name: '',
  flight_number: '',
  contact_name: '',
  contact_phone: '',
  deposit_amount: '',
  total_amount: '',
  comment: '',
  passengers: [{ ...EMPTY_PASSENGER }],
};
```

**Why:** Initial form state. Starts with one empty passenger.

```javascript
const { id } = useParams();
const isEdit = Boolean(id);
```

**Why:** Detects create vs edit mode from URL parameter. `/bookings/new` has no `id`, `/bookings/1/edit` has `id`.

```javascript
const [errors, setErrors] = useState({});
```

**Why:** Stores Laravel validation errors from the API response.

---

#### Form State Management

```javascript
const handleChange = (e) => {
  const { name, value } = e.target;
  setForm((prev) => ({ ...prev, [name]: value }));
  // Clear field error on change
  if (errors[name]) {
    setErrors((prev) => {
      const next = { ...prev };
      delete next[name];
      return next;
    });
  }
};
```

**Why:**
- Updates form state when input changes
- Clears the field error when user starts typing (better UX)

```javascript
const handlePassengerChange = (index, e) => {
  const { name, value } = e.target;
  setForm((prev) => {
    const passengers = [...prev.passengers];
    passengers[index] = { ...passengers[index], [name]: value };
    return { ...prev, passengers };
  });
};
```

**Why:** Updates a specific passenger's field by index.

---

#### Dynamic Passenger Management

```javascript
const addPassenger = () => {
  setForm((prev) => ({
    ...prev,
    passengers: [...prev.passengers, { ...EMPTY_PASSENGER }],
  }));
};
```

**Why:** Adds a new empty passenger row.

```javascript
const removePassenger = (index) => {
  if (form.passengers.length <= 1) return;
  setForm((prev) => ({
    ...prev,
    passengers: prev.passengers.filter((_, i) => i !== index),
  }));
};
```

**Why:** Removes a passenger row. `length <= 1` prevents removing the last passenger (Domain Rule: at least one required).

---

#### Form Submission

```javascript
const handleSubmit = async (e) => {
  e.preventDefault();
  setErrors({});
  setServerError('');
  setSaving(true);

  const payload = {
    ...form,
    pnr: form.pnr || null,
    travel_time: form.travel_time || null,
    // ...
  };
```

**Why:** Converts empty strings to `null` for optional fields. Laravel expects `null`, not empty string.

```javascript
  payload.passengers = payload.passengers.map((p) => {
    const { id: _, ...rest } = p;
    return _ ? { id: _, ...rest } : rest;
  });
```

**Why:** Removes `undefined` ids (new passengers) but keeps actual ids (existing passengers for update).

```javascript
  try {
    if (isEdit) {
      await api.put(`/bookings/${id}`, payload);
    } else {
      await api.post('/bookings', payload);
    }
    navigate('/bookings');
  } catch (error) {
    if (error.response?.status === 422) {
      setErrors(error.response.data.errors || {});
    } else {
      setServerError('Something went wrong. Please try again.');
    }
  }
};
```

**Why:**
- Uses `PUT` for update, `POST` for create
- Redirects to bookings list on success
- On 422 (validation error), displays errors next to fields
- On other errors, shows generic error message

---

#### Edit Mode — Loading Existing Data

```javascript
useEffect(() => {
  if (isEdit) {
    fetchBooking();
  }
}, [id]);

const fetchBooking = async () => {
  const response = await api.get(`/bookings/${id}`);
  const booking = response.data.data;

  setForm({
    pnr: booking.pnr || '',
    departure_location: booking.departure_location,
    // ...
    passengers: booking.passengers.map((p) => ({
      id: p.id,
      full_name: p.full_name,
      // ...
    })),
  });
};
```

**Why:** Loads existing booking data into the form. Each passenger gets its `id` for update tracking.

---

#### Reusable Field Component

```javascript
function Field({ label, name, type = 'text', value, onChange, error, required }) {
  return (
    <div>
      <label htmlFor={name} className="block text-sm font-medium text-gray-700 mb-1">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
      <input
        id={name}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        className={`w-full px-3 py-2 border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-300' : 'border-gray-300'
        }`}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error[0]}</p>
      )}
    </div>
  );
}
```

**Why:**
- Reusable input component with label, error display
- `required` adds red asterisk
- `error` highlights border in red and shows first error message
- Reduces code duplication in the form

---

### Files Modified

#### `src/App.jsx`

```javascript
import BookingFormPage from './pages/BookingFormPage';

// ...

<Route path="bookings/new" element={<BookingFormPage />} />
<Route path="bookings/:id/edit" element={<BookingFormPage />} />
```

**Why:** Two routes for the same component. `BookingFormPage` detects create vs edit by checking for `id` param.

---

### Form Layout

```
┌─────────────────────────────────────────────┐
│ Booking Details                             │
├─────────────────────────────────────────────┤
│ Departure Location    │ Destination         │
│ Travel Date           │ Travel Time         │
│ Airline Name          │ Flight Number       │
│ PNR                                         │
│ Contact Name          │ Contact Phone       │
│ Deposit Amount        │ Total Amount        │
│ Comment                                     │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ Passengers (2)                + Add Passenger│
├─────────────────────────────────────────────┤
│ Passenger 1                      [Remove]   │
│ Full Name  │ NRC Number │ Date of Birth     │
│ Phone      │ Passport   │ Ticket │ Seat     │
├─────────────────────────────────────────────┤
│ Passenger 2                      [Remove]   │
│ Full Name  │ NRC Number │ Date of Birth     │
│ Phone      │ Passport   │ Ticket │ Seat     │
└─────────────────────────────────────────────┘

[Create Booking]  [Cancel]
```

---

## Task 8 — Detail and Status

### Goal
Staff can review one full booking and update its state.

### Files Created

#### `src/pages/BookingDetailPage.jsx`

```javascript
const ALLOWED_TRANSITIONS = {
  pending: ['confirmed', 'cancelled'],
  confirmed: ['travelled', 'cancelled'],
  cancelled: ['refunded'],
  travelled: [],
  refunded: [],
};
```

**Why:** Defines which status transitions are allowed. Matches domain rules:
- `pending` → `confirmed`, `cancelled`
- `confirmed` → `travelled`, `cancelled`
- `cancelled` → `refunded`
- `travelled` → (none)
- `refunded` → (none)

```javascript
const [pnr, setPnr] = useState('');
const [updatingPnr, setUpdatingPnr] = useState(false);
const [pnrSaved, setPnrSaved] = useState(false);
```

**Why:** PNR has its own state separate from the booking object. `pnrSaved` shows a success message temporarily.

---

#### Status Update

```javascript
const handleStatusUpdate = async () => {
  if (!newStatus || newStatus === booking.status) return;

  setUpdatingStatus(true);
  try {
    await api.patch(`/bookings/${id}/status`, { status: newStatus });
    setBooking((prev) => ({ ...prev, status: newStatus }));
    setNewStatus('');
  } catch (err) {
    setError('Failed to update status.');
  } finally {
    setUpdatingStatus(false);
  }
};
```

**Why:**
- Uses `PATCH` method (partial update)
- Updates local state immediately (optimistic UI)
- Clears the dropdown after success

```javascript
const allowedTransitions = booking ? ALLOWED_TRANSITIONS[booking.status] || [] : [];
```

**Why:** Gets the allowed transitions for the current status. Empty array means no transitions available.

```jsx
{allowedTransitions.length > 0 && (
  <div>
    <label className="block text-sm font-medium text-gray-700 mb-2">
      Change status to:
    </label>
    <div className="flex gap-2">
      <select
        value={newStatus}
        onChange={(e) => setNewStatus(e.target.value)}
        className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">Select...</option>
        {allowedTransitions.map((status) => (
          <option key={status} value={status}>
            {STATUS_LABELS[status]}
          </option>
        ))}
      </select>
      <button
        onClick={handleStatusUpdate}
        disabled={!newStatus || updatingStatus}
        className="px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {updatingStatus ? 'Updating...' : 'Update'}
      </button>
    </div>
  </div>
)}
```

**Why:**
- Only shows the dropdown if transitions are available
- Dropdown options are filtered by `ALLOWED_TRANSITIONS`
- Button is disabled until a new status is selected

---

#### PNR Update

```javascript
const handlePnrUpdate = async () => {
  setUpdatingPnr(true);
  setPnrSaved(false);
  try {
    await api.put(`/bookings/${id}`, {
      departure_location: booking.departure_location,
      destination: booking.destination,
      travel_date: booking.travel_date,
      travel_time: booking.travel_time,
      contact_name: booking.contact_name,
      contact_phone: booking.contact_phone,
      passengers: booking.passengers.map((p) => ({ id: p.id })),
      pnr: pnr || null,
    });
    setBooking((prev) => ({ ...prev, pnr: pnr || null }));
    setPnrSaved(true);
    setTimeout(() => setPnrSaved(false), 2000);
  } catch (err) {
    setError('Failed to update PNR.');
  } finally {
    setUpdatingPnr(false);
  }
};
```

**Why:**
- Uses `PUT` (full update) because the API requires all fields
- Sends only passenger IDs (not full passenger data)
- Shows "PNR saved successfully!" for 2 seconds
- PNR can be updated for any status, but most useful for confirmed bookings

---

#### Page Layout

```
┌─────────────────────────────────────────────────────────┐
│ ← Back to bookings                    [Edit Booking]   │
│ BK-20260710-0001                                       │
├─────────────────────────────────┬───────────────────────┤
│ Route & Schedule                │ Status                │
│ Departure: Yangon               │ [Confirmed]           │
│ Destination: Bangkok            │                       │
│ Travel Date: 2026-08-20         │ Change status to:     │
│ Travel Time: 09:30              │ [Select... ▼] [Update]│
│ Airline: Thai Airways           │                       │
│ Flight: TG-301                  ├───────────────────────┤
├─────────────────────────────────┤ PNR                   │
│ Contact Person                  │ [A7XK2P________]      │
│ Name: U Aung Min                │ [Save PNR]            │
│ Phone: 09123456789              │                       │
├─────────────────────────────────┼───────────────────────┤
│ Passengers (2)                  │ Financial             │
│ ┌─────┬─────┬─────┬─────┬─────┐│ Deposit: 300,000      │
│ │Name │NRC  │Phone│Tkt  │Seat ││ Total: 850,000        │
│ ├─────┼─────┼─────┼─────┼─────┤│ Balance: 550,000      │
│ │...  │...  │...  │...  │...  ││                       │
│ └─────┴─────┴─────┴─────┴─────┘├───────────────────────┤
├─────────────────────────────────┤ Details               │
│ Comment                         │ Created by: Admin     │
│ Window seat if possible         │ Created at: 2026-07-10│
└─────────────────────────────────┴───────────────────────┘
```

---

### Files Modified

#### `src/App.jsx`

```javascript
import BookingDetailPage from './pages/BookingDetailPage';

// ...

<Route path="bookings/:id" element={<BookingDetailPage />} />
```

**Why:** Adds the detail route. Placed before `/bookings/:id/edit` so React Router matches it correctly.

---

## Commands Run

### Task 1
```bash
composer create-project laravel/laravel backend
npm create vite@latest frontend -- --template react
cd frontend && npm install
npm install -D tailwindcss @tailwindcss/vite
```

### Task 2
```bash
cd backend
composer require laravel/sanctum
php artisan vendor:publish --provider="Laravel\Sanctum\SanctumServiceProvider"
php artisan migrate
php artisan db:seed
```

### Task 3
```bash
php artisan make:migration create_bookings_table
php artisan make:migration create_passengers_table
php artisan migrate
php artisan test
```

### Task 4
```bash
# Created files manually, then:
php artisan route:list
php artisan test
```

### Task 5
```bash
cd frontend
npm install react-router-dom axios
npm run build
npm run lint
```

### Task 6
```bash
cd frontend
npm run build
```

### Task 7
```bash
cd frontend
npm run build
```

### Task 8
```bash
cd frontend
npm run build
```

---

## Files Changed Summary

### Task 1
- `README.md` — Added setup instructions
- `backend/` — New Laravel project
- `frontend/` — New React + Vite project

### Task 2
- `backend/.env` — MySQL config, Sanctum, cookie session
- `backend/.env.example` — Template
- `backend/app/Models/User.php` — HasApiTokens, role
- `backend/bootstrap/app.php` — Register api.php
- `backend/config/sanctum.php` — Published
- `backend/database/migrations/*` — Sanctum + role migrations
- `backend/database/seeders/AdminSeeder.php` — New
- `backend/database/seeders/DatabaseSeeder.php` — Updated
- `backend/routes/api.php` — New

### Task 3
- `backend/app/Models/Booking.php` — New
- `backend/app/Models/Passenger.php` — New
- `backend/database/factories/BookingFactory.php` — New
- `backend/database/factories/PassengerFactory.php` — New
- `backend/database/migrations/*` — Bookings + passengers migrations
- `backend/tests/Feature/BookingMigrationTest.php` — New
- `backend/tests/Feature/BookingRelationshipTest.php` — New

### Task 4
- `backend/app/Http/Controllers/Api/BookingController.php` — New
- `backend/app/Http/Controllers/Api/AuthController.php` — New (Task 2)
- `backend/app/Http/Requests/Api/StoreBookingRequest.php` — New
- `backend/app/Http/Requests/Api/UpdateBookingRequest.php` — New
- `backend/app/Http/Requests/Api/UpdateBookingStatusRequest.php` — New
- `backend/app/Http/Resources/BookingResource.php` — New
- `backend/app/Http/Resources/PassengerResource.php` — New
- `backend/app/Services/BookingService.php` — New
- `backend/routes/api.php` — Updated
- `backend/tests/Feature/BookingApiTest.php` — New

### Task 5
- `frontend/.env.example` — New (VITE_API_URL template)
- `frontend/src/lib/api.js` — New (Axios client with interceptors)
- `frontend/src/context/AuthContext.jsx` — New (Auth state management)
- `frontend/src/pages/LoginPage.jsx` — New (Login form)
- `frontend/src/pages/DashboardPage.jsx` — New (Placeholder dashboard)
- `frontend/src/components/Layout.jsx` — New (App shell with sidebar)
- `frontend/src/components/ProtectedRoute.jsx` — New (Auth guard)
- `frontend/src/App.jsx` — Updated (Router setup)
- `frontend/src/main.jsx` — Unchanged (entry point)
- `frontend/package.json` — Updated (added dependencies)

### Task 6
- `frontend/src/pages/BookingsPage.jsx` — New (Booking list with search, filters, pagination)
- `frontend/src/App.jsx` — Updated (Added /bookings route)
- `frontend/src/components/Layout.jsx` — Updated (Active link highlighting)

### Task 7
- `frontend/src/pages/BookingFormPage.jsx` — New (Create/edit form with dynamic passengers)
- `frontend/src/App.jsx` — Updated (Added /bookings/new and /bookings/:id/edit routes)

### Task 8
- `frontend/src/pages/BookingDetailPage.jsx` — New (Detail view with status update)
- `frontend/src/App.jsx` — Updated (Added /bookings/:id route)

---

## Post-MVP Updates

### 1. Responsive UI (Mobile to Desktop)

Made all pages responsive across screen sizes.

#### `src/components/Layout.jsx`

```javascript
const [sidebarOpen, setSidebarOpen] = useState(false);
```

**Why:** Tracks mobile sidebar open/close state.

```jsx
{/* Mobile sidebar overlay */}
{sidebarOpen && (
  <div
    className="fixed inset-0 bg-black/50 z-40 lg:hidden"
    onClick={() => setSidebarOpen(false)}
  />
)}
```

**Why:** Dark overlay behind sidebar on mobile. Clicking it closes the sidebar.

```jsx
<aside
  className={`fixed inset-y-0 left-0 w-64 bg-gray-800 text-white flex flex-col z-50 transition-transform duration-200 lg:translate-x-0 ${
    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
  }`}
>
```

**Why:**
- `lg:translate-x-0` — Always visible on desktop (lg = 1024px+)
- `-translate-x-full` — Hidden off-screen on mobile by default
- `translate-x-0` — Slides in when `sidebarOpen` is true
- `transition-transform` — Smooth slide animation

```jsx
{/* Mobile header */}
<header className="bg-white shadow-sm sticky top-0 z-30 lg:hidden">
  <div className="flex items-center justify-between px-4 py-3">
    <button onClick={() => setSidebarOpen(true)}>
      <svg>...</svg> {/* Hamburger icon */}
    </button>
  </div>
</header>
```

**Why:** Shows hamburger menu on mobile. Hidden on desktop (`lg:hidden`).

---

#### `src/pages/BookingsPage.jsx`

**Mobile filters:**
```jsx
<div className="sm:hidden">
  <form onSubmit={handleSearch} className="p-3">
    <div className="flex gap-2">
      <input ... placeholder="Search..." />
      <button type="submit">Go</button>
      <button type="button" onClick={() => setShowFilters(!showFilters)}>
        Filter
      </button>
    </div>
  </form>
</div>
```

**Why:** Mobile gets a compact search + filter toggle button. Desktop gets inline filters.

**Mobile card view:**
```jsx
<div className="sm:hidden divide-y divide-gray-200">
  {bookings.map((booking) => (
    <Link key={booking.id} to={`/bookings/${booking.id}`} className="block p-4">
      <div className="flex items-start justify-between">
        <span>{booking.booking_code}</span>
        <span className={STATUS_STYLES[booking.status]}>{booking.status}</span>
      </div>
      <div>{booking.departure_location} → {booking.destination}</div>
    </Link>
  ))}
</div>
```

**Why:** On mobile, bookings show as cards instead of a table. Better for small screens.

---

#### `src/pages/BookingFormPage.jsx`

```jsx
<div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
```

**Why:** Single column on mobile, two columns on tablet+.

```jsx
<button className="w-full sm:w-auto ...">
  {saving ? 'Saving...' : isEdit ? 'Update Booking' : 'Create Booking'}
</button>
```

**Why:** Full-width buttons on mobile, auto-width on desktop.

---

#### `src/pages/BookingDetailPage.jsx`

```jsx
<div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
  <div className="lg:col-span-2 space-y-4 sm:space-y-6">
    {/* Main content */}
  </div>
  <div className="space-y-4 sm:space-y-6">
    {/* Sidebar */}
  </div>
</div>
```

**Why:** Single column on mobile, two-column layout on desktop.

---

#### `src/pages/DashboardPage.jsx`

```jsx
<div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
  <StatCard label="Total" value={stats.total} />
  <StatCard label="Pending" value={stats.pending} />
  <StatCard label="Deposite" value={stats.deposite} />
  <StatCard label="Paid" value={stats.paid} />
  <StatCard label="Travelled" value={stats.travelled} />
</div>
```

**Why:** 2 columns on mobile, 5 columns on desktop for stat cards.

---

### 2. Status Transitions Update

Changed from `confirmed` to `deposite` and `paid` to match business flow.

#### New Status Flow
```
pending → deposite → paid → travelled
    ↑         ↑
    └─────────┘  (can go back)

deposite → refunded → cancelled
```

#### Files Updated

| File | Change |
|---|---|
| `backend/app/Http/Requests/Api/StoreBookingRequest.php` | `in:pending,deposite,paid,travelled,cancelled,refunded` |
| `backend/app/Http/Requests/Api/UpdateBookingStatusRequest.php` | Same |
| `backend/database/factories/BookingFactory.php` | Added `deposite()` and `paid()` states |
| `backend/tests/Feature/BookingApiTest.php` | Updated test statuses |
| `frontend/src/pages/BookingsPage.jsx` | Updated STATUS_OPTIONS and STATUS_STYLES |
| `frontend/src/pages/BookingDetailPage.jsx` | Updated ALLOWED_TRANSITIONS |
| `frontend/src/pages/DashboardPage.jsx` | Updated stats and colors |

#### Why these transitions are allowed

```javascript
const ALLOWED_TRANSITIONS = {
  pending: ['deposite', 'cancelled'],
  deposite: ['pending', 'paid', 'refunded'],
  paid: ['deposite', 'travelled'],
  travelled: [],      // Terminal — customer flew
  cancelled: [],      // Terminal — booking closed
  refunded: ['cancelled'], // Can close after refund
};
```

| From → To | Allowed | Reason |
|---|---|---|
| `pending` ↔ `deposite` | ✅ | Can correct mistakes |
| `deposite` ↔ `paid` | ✅ | Can correct mistakes |
| `paid` → `travelled` | ✅ | Mark as complete |
| `deposite` → `refunded` | ✅ | Process refund |
| `refunded` → `cancelled` | ✅ | Close booking after refund |
| `travelled` → anything | ❌ | Already flew, can't undo |
| `cancelled` → anything | ❌ | Already closed |

---

### 3. PNR Update Fix

Fixed PNR update in detail page to send all passenger data.

#### Before (broken)
```javascript
passengers: booking.passengers.map((p) => ({ id: p.id })),
```

**Why it failed:** Backend requires `full_name` for each passenger.

#### After (fixed)
```javascript
passengers: booking.passengers.map((p) => ({
  id: p.id,
  full_name: p.full_name,
  nrc_number: p.nrc_number,
  date_of_birth: p.date_of_birth,
  phone_number: p.phone_number,
  passport_number: p.passport_number,
  ticket_number: p.ticket_number,
  seat_number: p.seat_number,
})),
```

**Why:** Sends complete passenger data to satisfy backend validation.

---

### 4. Passenger Table Updates

#### Added DOB Column

```jsx
<th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">
  DOB
</th>
```

**Why:** Date of birth is important for passenger identification.

#### Fixed Alignment

```jsx
<th className="... whitespace-nowrap">DOB</th>
<td className="... whitespace-nowrap">{passenger.date_of_birth || '—'}</td>
```

**Why:** `whitespace-nowrap` prevents text from wrapping mid-word.

#### Removed Extra Parentheses

Before: `Passengers ({booking.passengers_count})`
After: `Passengers <span className="text-gray-400">{booking.passengers_count}</span>`

**Why:** Cleaner look with count in lighter color instead of parentheses.

---

## Files Changed Summary (Post-MVP)

### Responsive UI
- `frontend/src/components/Layout.jsx` — Mobile sidebar with hamburger menu
- `frontend/src/pages/BookingsPage.jsx` — Mobile card view, collapsible filters
- `frontend/src/pages/BookingFormPage.jsx` — Responsive form layout
- `frontend/src/pages/BookingDetailPage.jsx` — Responsive detail layout
- `frontend/src/pages/DashboardPage.jsx` — Responsive stats and table

### Status Transitions
- `backend/app/Http/Requests/Api/StoreBookingRequest.php` — Updated statuses
- `backend/app/Http/Requests/Api/UpdateBookingStatusRequest.php` — Updated statuses
- `backend/database/factories/BookingFactory.php` — Added deposite/paid states
- `backend/tests/Feature/BookingApiTest.php` — Updated test data
- `frontend/src/pages/BookingsPage.jsx` — Updated status options/colors
- `frontend/src/pages/BookingDetailPage.jsx` — Updated transitions
- `frontend/src/pages/DashboardPage.jsx` — Updated stats/colors

### Bug Fixes
- `frontend/src/pages/BookingDetailPage.jsx` — Fixed PNR update to send full passenger data
