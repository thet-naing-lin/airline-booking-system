# Coding Conventions

## Laravel
- Use API controllers in `App\Http\Controllers\Api`.
- Use Form Requests for validation and API Resources for response shape.
- Use plural route resources: `/api/bookings`.
- Use Eloquent relationships; avoid raw SQL unless justified.
- Use `foreignId()->constrained()` for foreign keys.
- Use PHP enums for booking status if the Laravel version supports it.
- Return consistent JSON: `{ "message": "...", "data": ... }`; paginated responses may use Laravel pagination metadata.
- Paginate index endpoints; default 20, max 100.

## React
- Use TypeScript. Do not use `any`.
- Keep API calls in `src/services/` or `src/lib/api/`, not inside presentational components.
- Create reusable types matching API resources.
- Use controlled forms and show API validation errors next to fields.
- Keep route-level pages in `src/pages/` and reusable UI in `src/components/`.

## Git
- Branch format: `feature/<short-name>`, `fix/<short-name>`, `chore/<short-name>`.
- Commit format: `feat: add booking passenger migrations`.
- Do not commit `.env`, generated builds, vendor, or node_modules.
