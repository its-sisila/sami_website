# Migration Files — Execution Order

Run these SQL files against the Supabase database in the following order.
Each migration is designed to be run once. If re-running, check for `IF NOT EXISTS` guards.

## Order

1. **`seed_pilot_station.sql`** — Creates the pilot station, initial user roles, and seed data. Run this first on a fresh database.
2. **`add_orders_tables.sql`** — Adds the orders and related tables (order items, delivery tracking).
3. **`add_station_settings.sql`** — Adds the station_settings table for per-station configuration.
4. **`refactor_nozzles_to_uuid.sql`** — Refactors nozzle identifiers from integer to UUID. **Destructive** — back up the nozzles table before running.
5. **`add_missing_sales_columns.sql`** — Adds missing columns to the sales tables (latest migration).

## Important Notes

- Always run migrations against a **staging/test database** first.
- Take a database backup before running any migration in production.
- Migrations 1–3 are idempotent (can be re-run safely).
- Migration 4 (`refactor_nozzles_to_uuid.sql`) is **NOT idempotent** — it alters column types.
- Migration 5 uses `IF NOT EXISTS` guards and is safe to re-run.
