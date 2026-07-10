# Code Explanation — Task 1 to Task 5

This document provides a line-by-line explanation of every code change made in Tasks 1-5, including the reasoning behind each decision.

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
