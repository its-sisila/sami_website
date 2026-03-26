# SAMI — Operational Runbook

Quick reference for common operational tasks in production.

---

## 1. Restarting the API

**Docker (self-hosted):**
```bash
docker-compose restart api
# Or for a full rebuild:
docker-compose down && docker-compose up -d --build
```

**Verify health after restart:**
```bash
curl https://your-api-domain.com/health
# Expected: {"status":"ok","service":"SAMI API"}
```

---

## 2. Running Database Migrations

```bash
# 1. Take a backup first
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d_%H%M%S).sql

# 2. Run the migration
psql $DATABASE_URL -f services/api/migrations/<migration_file>.sql

# 3. Verify — check for errors in output
```

See `services/api/migrations/README.md` for the correct execution order.

---

## 3. Rotating the JWT Secret

> ⚠️ This will **immediately invalidate all active user sessions**. Plan for off-peak hours.

1. Go to Supabase Dashboard → Settings → API → JWT Secret.
2. Generate a new secret.
3. Update `JWT_SECRET` in the production environment (secrets manager or hosting platform).
4. Restart the API server.
5. All users will need to log in again.

---

## 4. Restoring a Database Backup

```bash
# Restore from a pg_dump backup
psql $DATABASE_URL < backup_20260324_120000.sql
```

For Supabase-managed backups, use the Supabase Dashboard → Database → Backups → Restore.

---

## 5. Common Error Codes

| Code | Meaning | Action |
|------|---------|--------|
| `401` | Token expired/invalid | User needs to log in again |
| `403` | Insufficient role permissions | Check user's role in `profiles` table |
| `429` | Rate limit exceeded | Wait `Retry-After` seconds, or increase limit |
| `500` | Unhandled server error | Check server logs for stack trace |

---

## 6. Checking User Roles

```sql
-- Check a user's profile role
SELECT id, email, role FROM profiles WHERE email = 'user@example.com';

-- Check a user's station assignment
SELECT usr.user_id, usr.station_id, usr.role
FROM user_station_roles usr
WHERE usr.user_id = '<user-uuid>';

-- Promote a user to system_admin
UPDATE profiles SET role = 'system_admin' WHERE email = 'admin@example.com';
```

---

## 7. Monitoring Checklist

- [ ] Server logs are being captured (check CloudWatch/Datadog/Sentry)
- [ ] Database backup schedule is active (Supabase handles this by default)
- [ ] SSL certificate is valid and auto-renewing
- [ ] Docker healthcheck is passing: `docker inspect --format='{{.State.Health.Status}}' sami-api`
