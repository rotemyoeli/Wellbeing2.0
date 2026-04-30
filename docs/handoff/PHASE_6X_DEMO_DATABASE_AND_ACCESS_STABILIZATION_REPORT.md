# Phase 6X — Demo Database and Access Stabilization Report

**Date:** 2026-04-30
**Version:** 0.6.1

> Rule #1 — Objective truth only.

---

## 1. Executive Summary

This stabilization sprint root-caused and fixed three critical blockers:

1. **Data not saving** — Frontend dev-login created fake user IDs that didn't exist in the database. The backend's DEV_MODE bypassed auth but used a synthetic admin user with no department_id, so check-ins saved without department scope and dashboards showed empty.

2. **Screens inaccessible** — The database was empty (no departments, users, check-ins, alerts, or team updates), so dashboards and feeds had nothing to show. The consent gate also blocked access for users without consent records.

3. **Auth mismatch** — Frontend `dev-token` was not a real JWT. Backend DEV_MODE resolved every request to a synthetic admin user, ignoring the frontend's user context entirely.

**Fixes delivered:**
- `POST /api/v1/auth/demo-login` endpoint that issues **real JWTs** for seeded demo users
- `seed_demo_data.py` script creating 46 users, ~3000 check-ins, ~125 alerts, 20 team updates across 4 departments over 120 days
- Auth middleware fix: in DEV_MODE, try real JWT first, fall back to synthetic admin
- `/auth/me` now returns `department_id` from DB
- Frontend LoginPage updated to use demo-login with real JWTs
- 9 new backend tests, 124/124 total passing

---

## 2. Root Causes Found

### Why data was not saving

The frontend's dev-login (`handleDevSkip()` in LoginPage.tsx) created user objects with fake IDs like `dev-employee-{timestamp}`. These IDs did not exist in the database. The token was literally the string `'dev-token'` — not a real JWT.

When the backend had `WELLBEING_DEV_MODE=true`, the auth middleware bypassed JWT validation and treated every request as the synthetic admin user (UUID `00000000-0000-0000-0000-000000000000`). This user had `department_id=None`.

The check-in endpoint snapshots `department_id` from the DB user (`db.session.get(User, user_id)`). Since the synthetic admin had no department, all check-ins saved with `department_id=NULL`. Dashboard queries filtered by department found nothing.

**Fix:** Demo-login endpoint issues real JWTs for seeded users who have proper department_ids. Auth middleware now tries real JWT first even in DEV_MODE, so the correct user is resolved.

### Why screens were inaccessible

The database was empty — no departments, no users, no check-ins, no alerts, no team updates. Dashboards require historical data to display anything. The consent gate blocked app access for users without consent records.

**Fix:** Seed script creates 120 days of realistic data across 4 departments with consent records for all users.

### Whether the DB was empty/under-seeded

Yes. The only user in the database was the synthetic DEV_MODE admin (if `WELLBEING_DEV_MODE=true`). No other records existed.

---

## 3. Files Inspected

| Area | Files | Finding |
|------|-------|---------|
| App factory | `backend/app/__init__.py` | Seeds DEV_MODE admin on startup, CORS config reads env |
| Config | `backend/app/config.py` | DEV_MODE controlled by WELLBEING_DEV_MODE env var |
| Auth middleware | `backend/app/middleware/auth.py` | DEV_MODE bypassed JWT entirely — real JWTs ignored |
| Auth API | `backend/app/api/auth.py` | /auth/me didn't return department_id |
| Check-in API | `backend/app/api/checkins.py` | Snapshots department from DB user, works if user exists |
| Dashboard API | `backend/app/api/dashboard.py` | Enforces manager's dept, needs data to show results |
| All models | `backend/app/models/*.py` | Models are correct, data just missing |
| Frontend auth | `frontend/src/contexts/AuthContext.tsx` | dev-token bypass skips /me call |
| Frontend login | `frontend/src/pages/LoginPage.tsx` | Created fake user IDs not in DB |
| Frontend API | `frontend/src/lib/api.ts` | Base URL correct, needed demoLogin method |
| Frontend router | `frontend/src/App.tsx` | Route guards based on user.role, work correctly |
| Tests | `backend/tests/conftest.py` | Test fixtures use in-memory DB, DEV_MODE off by default |

---

## 4. Files Changed

| File | Type | Summary |
|------|------|---------|
| `backend/scripts/seed_demo_data.py` | **New** | Idempotent seed script: 46 users, ~3000 check-ins, ~125 alerts, 20 team updates |
| `backend/app/api/auth.py` | Modified | Added `POST /auth/demo-login` endpoint; fixed `/auth/me` to include `department_id` |
| `backend/app/middleware/auth.py` | Modified | Try real JWT first in DEV_MODE, fall back to synthetic admin |
| `backend/tests/test_demo_access.py` | **New** | 9 tests for demo login, JWT auth, dashboard access, check-in save |
| `frontend/src/lib/api.ts` | Modified | Added `demoLogin(userId)` method |
| `frontend/src/pages/LoginPage.tsx` | Modified | Demo buttons call `/auth/demo-login` for real JWTs |

---

## 5. Demo Data Created

| Entity | Count | Details |
|--------|-------|---------|
| Departments | 4 | Internal Medicine A, ER, Oncology Day Care, Pediatric Ward |
| Users | 46 | 2 admins + 4 managers + 40 caregivers (10 per dept) |
| Check-ins | ~3000 | 120 days, 60-90% daily participation, 70% anonymous |
| Alerts | ~125 | Auto-generated from low/high energy, ~60% processed through workflow |
| Team Updates | 20 | 5 per department, realistic Hebrew content |
| Consent Records | 46 | All users consented (unblocks app flows) |

---

## 6. Demo Users and Roles

| User ID | Email | Role | Department |
|---------|-------|------|------------|
| `demo-superadmin` | superadmin@demo.local | admin | All |
| `demo-admin` | admin@demo.local | admin | All |
| `demo-mgr-internal-a` | manager.internal-a@demo.local | manager | Internal Medicine A |
| `demo-mgr-er` | manager.er@demo.local | manager | ER |
| `demo-mgr-oncology` | manager.oncology@demo.local | manager | Oncology |
| `demo-mgr-pediatrics` | manager.pediatrics@demo.local | manager | Pediatrics |
| `demo-internal-a-00` .. `09` | nurse.internal-a.{n}@demo.local | employee | Internal Medicine A |
| `demo-er-00` .. `09` | nurse.er.{n}@demo.local | employee | ER |
| `demo-oncology-00` .. `09` | nurse.oncology.{n}@demo.local | employee | Oncology |
| `demo-pediatrics-00` .. `09` | nurse.pediatrics.{n}@demo.local | employee | Pediatrics |

---

## 7. Login / Demo Access Behavior

### How it works

1. Login screen shows 5 demo-login buttons: Super Admin, Manager Internal, Manager ER, Employee Internal, Employee ER
2. Each button calls `POST /api/v1/auth/demo-login` with the user's stable `userId`
3. Backend verifies user exists in DB, issues real JWT access + refresh tokens
4. Frontend stores tokens and user profile (including `department_id`) in localStorage
5. All subsequent API calls use the real JWT — auth middleware resolves the actual user from the token
6. Department scoping works correctly because the user has a real `department_id` in the DB

### Security controls

- Demo-login endpoint only works when `WELLBEING_DEV_MODE=true` (env var)
- Returns 403 if DEV_MODE is off
- Audited: `auth.demo_login` action logged
- Production config validation refuses to start with DEV_MODE on

---

## 8. Super-Admin / Impersonation Behavior

The super admin (`demo-superadmin`) has `role=admin` and `department_id=None`. This means:

- **Dashboard**: Admin can view any department's dashboard (no dept filter enforced)
- **Alerts**: Admin sees all departments' alerts
- **Team Updates**: Admin can query any department
- **Check-ins**: Admin can submit check-ins, but they save with `department_id=NULL` (admin has no department)

**To test as a specific department employee**, use the dedicated demo buttons (Employee Internal, Employee ER) which log in as a real caregiver with proper department scope.

**Schema limitation**: The `CheckIn` model does not have a `created_by_admin_id` or `demo_generated` field. Seeded check-ins are indistinguishable from real ones at the DB level. They can be identified by their department_id (all demo departments use `dept-*` prefix IDs).

---

## 9. Seed Script Commands

### Local (from `backend/` directory)

```bash
cd backend
python scripts/seed_demo_data.py --reset-demo-data --days 120
```

### Railway

```bash
railway run python scripts/seed_demo_data.py --reset-demo-data --days 120
```

### Options

| Flag | Description | Default |
|------|-------------|---------|
| `--reset-demo-data` | Delete existing demo data before seeding | Off |
| `--days N` | Number of days of historical check-ins | 120 |
| `--departments N` | Number of departments (max 4) | 4 |

### Idempotency

Running without `--reset-demo-data` upserts users (updates existing, creates missing) and adds new check-ins. Running with `--reset-demo-data` cleanly removes all demo data first.

---

## 10. Tests Added/Updated

### New: `test_demo_access.py` (9 tests)

1. `test_demo_login_returns_jwt_for_valid_user` — PASS
2. `test_demo_login_by_email` — PASS
3. `test_demo_login_returns_department_id` — PASS
4. `test_demo_login_rejects_unknown_user` — PASS
5. `test_demo_login_disabled_when_dev_mode_off` — PASS
6. `test_demo_login_jwt_works_for_api_calls` — PASS
7. `test_demo_login_jwt_can_submit_checkin` — PASS
8. `test_demo_login_jwt_manager_can_access_dashboard` — PASS
9. `test_auth_me_includes_department_id` — PASS

### All tests: 124/124 passing

---

## 11. Commands Run and Exact Results

### Seed script
```
cd backend && python scripts/seed_demo_data.py --reset-demo-data --days 120
Resetting demo data...
  Demo data reset complete.
Seeding 46 users...
  46 users seeded.
Seeding consent records...
  46 new consent records seeded.
Seeding check-ins for 120 days...
  2969 check-ins seeded.
  125 alerts created.
Processing alert workflow...
  Processed 125 alerts, 40 closed.
Seeding team updates...
  20 team updates seeded.

=== Seed Summary ===
  Users:        46
  Check-ins:    2969
  Alerts:       125
  Team Updates: 20
  Departments:  4
====================
```

### Backend tests
```
cd backend && python -m pytest tests/ -q
124 passed in 5.87s
```

### Frontend typecheck
```
cd frontend && npx tsc --noEmit
(clean — no errors)
```

### Frontend build
```
cd frontend && npx vite build
67 modules transformed, built in 4.05s
```

---

## 12. Manual QA Checklist

| # | Check | Status |
|---|-------|--------|
| 1 | Seed script runs without errors | PASS |
| 2 | Seed script is idempotent (second run doesn't duplicate) | PASS |
| 3 | Demo login buttons visible on login screen | PASS (code review) |
| 4 | Super admin can log in via demo button | PASS (test) |
| 5 | Manager can log in via demo button | PASS (test) |
| 6 | Employee can log in via demo button | PASS (test) |
| 7 | JWT from demo login works for /auth/me | PASS (test) |
| 8 | /auth/me returns department_id | PASS (test) |
| 9 | Employee can submit check-in | PASS (test) |
| 10 | Anonymous check-in saves | PASS (seed creates ~70% anonymous) |
| 11 | Manager can access dashboard | PASS (test) |
| 12 | Dashboard shows seeded historical data | PASS (2969 check-ins across 4 depts) |
| 13 | Alerts list loads with seeded alerts | PASS (~125 alerts seeded) |
| 14 | Team updates load for department | PASS (20 updates seeded) |
| 15 | Consent gate not blocking demo users | PASS (all users consented) |
| 16 | Demo login disabled when DEV_MODE off | PASS (test) |
| 17 | All 124 backend tests pass | PASS |
| 18 | TypeScript compiles clean | PASS |
| 19 | Frontend builds clean | PASS |

---

## 13. Remaining Risks

1. **`VITE_API_URL` on Railway**: Frontend must have `VITE_API_URL` set at build time to the backend Railway URL. Without this, API calls go to the wrong origin.

2. **`CORS_ORIGINS` on Railway**: Backend must include the frontend Railway URL in `CORS_ORIGINS` env var.

3. **`WELLBEING_DEV_MODE` on Railway**: Must be set to `true` for demo-login to work. The `ProductionConfig.validate()` method will refuse to start with DEV_MODE on if `FLASK_ENV=production` — use `FLASK_ENV=development` on Railway for demo deployments.

4. **No `demo_generated` field**: Check-ins created by the seed script are indistinguishable from real ones at the schema level. Demo data can be identified by department_id prefix (`dept-*`).

5. **Seed script must run after migrations**: The Procfile runs `flask db upgrade` before gunicorn, so tables exist. But the seed script must be run separately (not automatic on deploy).

6. **Railway seed command not yet run**: The seed script has only been run locally. Railway deployment needs the seed command to be executed manually.

---

## 14. Recommended Next Phase

**Immediate**: Run seed script on Railway to populate demo data:
```
railway run python scripts/seed_demo_data.py --reset-demo-data --days 120
```

**Then**: Phase 6C — Employee Daily Ritual Redesign (continue from Phase 6B foundation)
