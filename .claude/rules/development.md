# Development Workflow

## First check
Run these from the repository root as applicable:
```bash
git status
cd backend && php artisan about
cd frontend && npm run
```

## Backend
Expected local commands:
```bash
cd backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate
php artisan serve
php artisan test
```

## Frontend
Expected local commands:
```bash
cd frontend
npm install
npm run dev
npm run build
```

## Before marking work done
1. Run relevant backend tests.
2. Run frontend build and/or lint if configured.
3. Check `git diff`.
4. Update `docs/05-progress.md`.
5. State changed files, commands run, and remaining manual checks.

## Safety
Never run destructive commands such as `migrate:fresh`, `db:wipe`, or force-push without explicit user approval.
