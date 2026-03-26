# Comprehensive Production-Readiness Testing Strategy for SAMI v1.5

As SAMI transitions towards onboarding external clients and deploying as a full production application, the testing strategy must expand beyond basic unit and integration tests. This document outlines the absolute prerequisites and advanced testing methodologies required for a **Senior Engineering standard of release**.

---

## 1. Local Application Logic Testing

This forms the base of the testing pyramid. Before any code is merged, these must pass.

### A. Backend Testing (Python FastAPI, located in `services/api/`)

*Tools: `pytest`, `pytest-asyncio`, `pytest-cov`, `httpx`*

- **Unit Tests**:
  - Test individual calculation functions isolated from the database (e.g., logic in `tools.py`).
  - Validate all Pydantic schemas in `schemas.py` to ensure request/response models behave exactly as expected under edge cases (missing fields, wrong types).
- **Integration Tests**:
  - Test the FastAPI router endpoints in `routes.py`.
  - Use an in-memory or purely isolated test database (e.g., a test PostgreSQL schema).
  - Verify correct HTTP status codes (200, 201, 400, 401, 403, 404, 500) and error message formats.

### B. Frontend Testing (Next.js Dashboard, located in `apps/dashboard/`)

*Tools: `Jest`, `React Testing Library (RTL)`, `MSW (Mock Service Worker)`*

- **Component Tests (Unit)**: Isolate UI components (buttons, grids, modals) and ensure they render correctly based on props.
- **Hook Tests**: Test custom hooks (e.g., data fetching, state management) in isolation.
- **Page Integration Tests**: Use MSW to mock the backend API and verify that Next.js pages (like `pricing/page.tsx` or `sales/page.tsx`) correctly handle loading states, successful data rendering, and API error states.

---

## 2. End-to-End (E2E) & User Acceptance Testing (UAT)

*Tools: `Playwright` or `Cypress`*

E2E tests simulate a real user interacting with the live browser and a running backend/database.

- **Critical Path Testing**: Automate the most important user journeys:
  - User login and authentication flow.
  - Viewing, editing, and saving a pricing plan.
  - Generating and exporting a sales report.
  - Creating a new employee account.
- **Cross-Browser Testing**: Ensure the UI works on Chrome, Safari, and Firefox (Playwright handles this well).
- **Mobile Responsiveness Tests**: Simulate mobile viewpoints to ensure the dashboard doesn't break on a phone/tablet.

---

## 3. Security Testing (Crucial for Client Onboarding)

When handling client data, security cannot be an afterthought.

- **Authentication & Authorization (RBAC) Tests**:
  - Write explicit tests verifying that a user with a "Standard" role *cannot* access or mutate data on an "Admin" endpoint.
  - Verify JWT token expiration, rotation, and invalidation upon logout.
- **Static Application Security Testing (SAST)**:
  - Backend: Integrate `bandit` into the CI pipeline to scan Python code for vulnerabilities (e.g., SQL injection risks, hardcoded secrets).
  - Frontend: Use `npm audit` or tools like `Snyk` to ensure frontend dependencies don't have known CVEs.
- **Secret Scanning**:
  - Utilize tools like `git-secrets` or `TruffleHog` to guarantee no `.env` files, API keys, or database credentials are ever committed to the repository.

---

## 4. Database & Migration Testing

Client data integrity is paramount. Broken database migrations can cause catastrophic production outages.

- **Migration Tests**: If using `alembic` or similar tools, test that migrations can successfully upgrade (`up`) AND downgrade (`down`) against a populated database without corrupting data.
- **Data Integrity Tests**:
  - Verify foreign key constraints are strictly enforced.
  - Verify cascading deletes (e.g., if a client account is deleted, do their associated sales records delete, or are they safely archived?).

---

## 5. Performance & Load Testing

*Tools: `k6` by Grafana, or `Locust`*

Will SAMI survive if 50 clients log in and request heavy pricing calculations simultaneously?

- **Load Testing**: Simulate expected peak traffic to the FastAPI backend. Measure the 95th percentile response times.
- **Stress Testing**: Push the application beyond anticipated limits to find the breaking point and observe how it fails (does it crash gracefully? Does auto-scaling kick in?).
- **Frontend Optimization**: Run Next.js builds with Lighthouse CI to ensure Core Web Vitals (Largest Contentful Paint, Time to Interactive) remain fast.

---

## 6. API Contract Testing

*Tools: `Pact` or Native OpenAPI Schema Validation*

Since the Next.js frontend and FastAPI backend are separate, they must agree on the data format.

- **Schema Validation**: Ensure the frontend's TypeScript interfaces perfectly match the backend's OpenAPI (Swagger) output. If a backend developer renames a field in `schemas.py`, the CI pipeline should break the frontend build *before* it gets to production.

---

## 7. Operational & Infrastructure Testing

Testing the deployment environment itself.

- **Docker Build Tests**: Ensure `docker-compose.yml` or Dockerfiles build successfully from a completely clean state.
- **Environment Variable Validation**: The application should fail to boot immediately (Fail Fast) if required environment variables (like `DATABASE_URL` or `JWT_SECRET`) are missing, rather than crashing silently midway through a user request.
- **Observability/Logging Tests**: Ensure that 500 Internal Server errors produce a structured log (JSON) that can be ingested by monitoring tools (Datadog, AWS CloudWatch, Sentry) and that alerts trigger correctly.

---

## Senior Dev Summary & Checklist Before Production Launch

Before clicking "Deploy to Production" for external clients, this checklist must be satisfied:

- [ ] **CI/CD Pipeline Enforced**: No code is merged to `main` without passing automated backend/frontend test suites.
- [ ] **Minimum Coverage Met**: 80%+ test coverage enforced via `pytest-cov` and `jest --coverage`.
- [ ] **E2E Critical Paths Covered**: Playwright tests cover Login, Core Data Fetching, and Data Mutation.
- [ ] **Security Scanned**: `bandit` and `npm audit` show zero critical vulnerabilities.
- [ ] **Environment Segregation**: A `staging` environment exists that perfectly mirrors production, and tests are run against `staging` before the final release.
- [ ] **Backups Verified**: Automated database backups are configured, and a test restoration has been successfully performed.
