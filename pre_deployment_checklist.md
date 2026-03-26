# SAMI v1.5 — Pre-Deployment Checklist

> This checklist must be completed **before** deploying SAMI to production or onboarding any new client. Every item should be verified by a team member and signed off.

---

## 1. Code Quality & Review

- [ ] All feature branches are merged into `main` via reviewed Pull Requests.
- [ ] No `TODO`, `FIXME`, or `HACK` comments remain in production code paths.
- [ ] All debug/utility scripts are excluded from deployment (e.g., `debug_all_users.py`, `debug_pricing_service.py`, `check_db_state.py`, `reset_demo_password.py`, `add_mock_pricing_data.py`).
- [ ] `.dockerignore` and `.gitignore` are up to date and exclude test data, virtual environments, and IDE files.
- [ ] Linting passes cleanly on both backend (`flake8`/`ruff`) and frontend (`eslint`).
- [ ] No hardcoded URLs, IPs, or credentials exist anywhere in the codebase.

---

## 2. Environment & Configuration

- [ ] `.env.example` is complete and documents every required environment variable.
- [ ] Production `.env` values are set via a secure secrets manager (not committed to Git).
- [ ] `CORS_ORIGINS_STR` in `docker-compose.yml` and backend config is restricted to production domains only (`https://dashboard.getsami.app`, `https://getsami.app`). Local origins (`localhost`) are removed.
- [ ] `DATABASE_URL` points to the production database, NOT the development/staging database.
- [ ] `JWT_SECRET` / `SECRET_KEY` is a strong, unique, randomly generated value (min 32 chars).
- [ ] Python runtime version in `runtime.txt` matches the production server.
- [ ] Node.js version used for the dashboard build matches the Vercel project settings.

---

## 3. Database & Migrations

- [ ] All SQL migration files in `services/api/migrations/` have been reviewed and tested on a staging database (including `add_missing_sales_columns.sql`).
- [ ] Migrations run successfully in order against a clean database (fresh install test).
- [ ] Migrations run successfully against a populated staging database (upgrade test).
- [ ] Rollback/downgrade scripts exist for critical migrations.
- [ ] Foreign key constraints, indexes, and cascading rules are verified for all tables related to: `accounts`, `employees`, `pricing`, `sales`, `inventory`, `orders`, `expenses`, `settlements`, `stations`, `forecasting`.
- [ ] No orphaned records exist from development/testing.
- [ ] Automated database backups are configured and a test restore has been performed.

---

## 4. Authentication & Authorization

- [ ] Login flow works end-to-end (dashboard login page → API `/auth` endpoint → JWT issued → session established).
- [ ] JWT tokens expire within a reasonable timeframe (e.g., 1 hour access, 7 day refresh).
- [ ] Expired/invalid tokens return `401 Unauthorized` consistently across all protected endpoints.
- [ ] Role-Based Access Control (RBAC) is enforced:
  - [ ] Admin-only endpoints in `admin/` module reject non-admin users.
  - [ ] Standard users cannot access or modify other users' data.
- [ ] Password reset flow works correctly.
- [ ] The `unauthorized` page in the dashboard renders for forbidden actions.

---

## 5. API Verification (All Backend Modules)

Each module under `services/api/app/modules/` must have its routes manually or automatically tested:

| Module          | GET (List) | GET (Detail) | POST (Create) | PUT/PATCH (Update) | DELETE | Error Handling |
|-----------------|:----------:|:------------:|:--------------:|:-------------------:|:------:|:--------------:|
| **accounts**    | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **admin**       | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **auth**        | N/A        | N/A          | [ ] Login      | [ ] Refresh         | [ ] Logout | [ ]        |
| **employees**   | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **expenses**    | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **exports**     | [ ]        | N/A          | [ ]            | N/A                 | N/A    | [ ]            |
| **forecasting** | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **inventory**   | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **orders**      | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **pricing**     | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **sales**       | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **settlements** | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **stations**    | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |
| **users**       | [ ]        | [ ]          | [ ]            | [ ]                 | [ ]    | [ ]            |

---

## 6. Frontend (Dashboard) Verification

- [ ] All pages load without console errors:
  - [ ] Dashboard (Home)
  - [ ] Accounts
  - [ ] Admin
  - [ ] Inventory
  - [ ] Pricing
  - [ ] Sales
  - [ ] Settings
  - [ ] Staff
- [ ] Login page redirects authenticated users to the dashboard.
- [ ] Unauthenticated users are redirected to the login page.
- [ ] `error.tsx` global error boundary renders gracefully on unexpected errors.
- [ ] `not-found.tsx` renders correctly for invalid routes.
- [ ] All forms validate input before submission (client-side validation).
- [ ] Toasts/notifications display for success and error actions.
- [ ] Responsive design works on tablet and mobile viewports.

---

## 7. Security Hardening

- [ ] HTTPS is enforced on all production domains.
- [ ] API rate limiting is configured to prevent brute-force and DDoS attacks.
- [ ] All user inputs are sanitized on the backend to prevent SQL injection and XSS.
- [ ] CORS is restricted to only the production frontend domains.
- [ ] HTTP security headers are set (`X-Content-Type-Options`, `X-Frame-Options`, `Strict-Transport-Security`, `Content-Security-Policy`).
- [ ] `npm audit` returns zero critical vulnerabilities for the frontend.
- [ ] `pip-audit` or `safety check` returns zero critical vulnerabilities for the backend.
- [ ] No `.env`, debug files, or `__pycache__` directories are included in the Docker image (verified via `.dockerignore`).

---

## 8. Performance

- [ ] API response times for key endpoints are under 500ms (p95) under expected load.
- [ ] Database queries are optimized (no N+1 queries, proper indexing on frequently filtered columns).
- [ ] Next.js production build (`next build`) completes without warnings.
- [ ] Lighthouse score for the dashboard is acceptable (Performance > 70, Accessibility > 80).
- [ ] Large data sets (e.g., sales history, employee lists) are paginated.

---

## 9. Infrastructure & Deployment

- [ ] `Dockerfile` builds successfully from a clean state (`docker build --no-cache`).
- [ ] `docker-compose up` starts the API container and passes the healthcheck.
- [ ] Vercel deployment for `apps/dashboard` is configured and building correctly.
- [ ] Production domain DNS (`dashboard.getsami.app`, `getsami.app`) resolves correctly.
- [ ] SSL certificates are valid and auto-renewing.
- [ ] Application logs are being captured by a monitoring service (e.g., Sentry, Datadog, CloudWatch).
- [ ] Error alerting is configured (email/Slack notification for 500-level errors).

---

## 10. Data & Business Logic

- [ ] Pricing calculation formula (fuel price prediction) produces correct results matching the verified formula (see `price_formula.py` and `next_steps_for_price_formula.md`).
- [ ] The MOPS data scraper (`scraping.py`, `scripts/test_scraper.py`) runs successfully and populates correct data.
- [ ] Sales data aggregation and reporting logic is accurate.
- [ ] Export functionality (reports, CSVs) generates correct and complete files.
- [ ] Nozzle storage tracking (`useNozzleStorage.ts`) calculates and persists data correctly.
- [ ] Forecasting module predictions are within acceptable accuracy thresholds.

---

## 11. Documentation & Handoff

- [ ] `README.md` is up-to-date with setup instructions, architecture overview, and deployment steps.
- [ ] API documentation (Swagger/OpenAPI) is accessible at `/docs` and accurately reflects all endpoints.
- [ ] Client onboarding guide is prepared (how to create their account, first login, initial data setup).
- [ ] Internal runbook exists for common operational tasks (restart API, run migrations, restore backup).

---

## 12. Completed Implementation Work

All items below have been implemented. Verify each is working correctly before sign-off.

### Phase 1: Security Fixes
- [x] Removed hardcoded admin UUID from `services/api/app/core/security.py` — role resolution now relies purely on DB `Profile.role`.
- [x] Removed `/debug/cors` endpoint from `services/api/app/main.py` — no longer leaks CORS configuration.
- [x] Sanitized global exception handler — `str(exc)` is only shown when `DEBUG=true`, production returns a generic message.
- [x] Added fail-fast validation in `services/api/app/core/config.py` — app crashes immediately with a clear error if `JWT_SECRET` or `DATABASE_URL` are missing/default.
- [x] Removed `localhost` from `DEFAULT_CORS_ORIGINS` — devs must add local origins via `.env`.
- [x] Hardened `services/api/.dockerignore` — excludes all debug scripts (`debug_*.py`, `reset_demo_password.py`, `add_mock_pricing_data.py`, etc.), `.env`, `venv312/`, `scripts/`.

### Phase 2: Backend Test Suite
- [x] Added `pytest-cov` and `bandit` to `services/api/tests/requirements-test.txt`.
- [x] Created `services/api/tests/test_auth.py` — 13 tests covering JWT verification (valid, expired, wrong-secret, malformed, wrong-audience tokens) and endpoint auth enforcement.
- [x] Created `services/api/tests/test_api_endpoints.py` — Smoke tests for all 14 mounted routers (employees, accounts, pricing, sales, inventory, orders, settlements, stations, admin, auth, users, exports, expenses, forecasting) + OpenAPI docs accessibility.
- [x] Created `services/api/tests/test_rate_limit.py` — 8 tests for rate limiter (within/at/over limit, Retry-After header, user isolation, time window cleanup).
- [x] Created `services/api/tests/test_config.py` — 10 tests for CORS parsing (comma-separated, JSON array, empty fallback), fail-fast validation, and async database URL conversion.

### Phase 3–4: CI/CD Pipeline
- [x] Created `.github/workflows/ci.yml` with 3 jobs:
  - **backend-tests**: Python 3.11, `pytest --cov`, `bandit` security scan.
  - **frontend-checks**: Node 20, `npm run lint`, `npm run build`.
  - **docker-build**: `docker build --no-cache` + image size validation (< 1GB).
- Triggers on push to `main`/`dashboard` and on all PRs.

### Phase 5: Infrastructure
- [x] Created `services/api/app/core/logging.py` — Structured JSON logging for production (CloudWatch/Datadog/Sentry compatible), human-readable format for development.

### Phase 6: Database & Migration Safety
- [x] Created `services/api/migrations/README.md` — Documents correct migration execution order (1→5), idempotency notes, and backup warnings.

### Phase 7: Documentation
- [x] Created `docs/operational_runbook.md` — Production ops guide covering: API restart, running migrations, JWT secret rotation, database restore, common error codes, user role management, and monitoring checklist.

---

## Sign-Off

| Role              | Name | Date | Approved |
|-------------------|------|------|----------|
| Lead Developer    |      |      | [ ]      |
| QA / Tester       |      |      | [ ]      |
| DevOps / Infra    |      |      | [ ]      |
| Product Owner     |      |      | [ ]      |
