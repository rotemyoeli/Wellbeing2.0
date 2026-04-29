# HANDOFF.md

> Sprint 4 — v0.4 delivered. Manager dashboard + alert ack workflow + comment encryption + cleanup.
> Last updated: 2026-04-29 | Sprint: 4 | Version: 0.4.0

---

## Rule #1 — Objective truth only

Repeated in every handoff so it never gets lost. Full text in `CLAUDE.md`.

---

## What this sprint delivered

**Sprint 4 — v0.4: manager dashboard + alert workflow + encryption activation + cleanup.**

### Backend deliverables

| Component | Status | Notes |
|---|---|---|
| `app/utils/crypto.py` — AES-256-GCM | ✅ Working | BLAKE2b key derivation; per-message random nonce; round-trip verified |
| `CheckInService._encrypt_comment` activated | ✅ Working | Comment column now stores real ciphertext, not plaintext |
| `app/services/dashboard_service.py` | ✅ Working | KPIs, trend, role breakdown, ≥5 aggregation enforcement |
| `app/services/alert_service.py` extended | ✅ Working | `list_alerts()`, `acknowledge()` state machine |
| `app/api/dashboard.py` (`GET /summary`) | ✅ Working | manager/admin only; period 1-90 days; audit-logged |
| `app/api/alerts.py` (`GET /`, `POST /:id/ack`) | ✅ Working | Strict workflow: open→ack1→ack2→closed; note required at close |
| `datetime.utcnow()` → `utcnow()` cleanup | ✅ Done | Centralised in `app/models/__init__.py`; tz-aware UTC throughout |
| Backend tests | ✅ **86/86 passing (verified)** | +32 new tests over Sprint 3 |
| Backend warnings during tests | ✅ **Zero** (was 239 in Sprint 3) | Datetime deprecation chatter eliminated |

Test breakdown:
- `test_anon_token.py` — 13 (unchanged)
- `test_health.py` — 4 (unchanged)
- `test_checkins.py` — 13 (unchanged)
- `test_auth.py` — 17 (unchanged)
- `test_audit.py` — 5 (unchanged)
- `test_rate_limit.py` — 2 (unchanged)
- `test_crypto.py` — 8 NEW (round-trip, unicode, tampering detection, key derivation)
- `test_dashboard.py` — 11 NEW (empty DB, ≥5 threshold rule, period clamping, RBAC 403 for employee)
- `test_alerts.py` — 13 NEW (list, status filter, full ack flow, out-of-order rejection, note required, 404, terminal-closed)

### Frontend deliverables

| Component | Status | Notes |
|---|---|---|
| `src/types/index.ts` | ✅ Updated | Added `Alert`, `DashboardSummary`, `DashboardRoleRow`, `DashboardTrendPoint`; aligned all to snake_case wire format |
| `src/lib/api.ts` | ✅ Updated | Added `dashboardSummary()`, `listAlerts()`, `ackAlert()` |
| `src/pages/DashboardPage.tsx` | ✅ Working | KPI strip, open-alerts-first layout, per-role breakdown with threshold messaging, daily trend list, full ack-flow UI inline per alert |
| `src/App.tsx` (rewritten) | ✅ Working | Role-based: managers/admins get a top tab to switch between Check-in and Dashboard; employees see only Check-in |
| Frontend tests | ⚠️ NOT verified in build sandbox | Existing 9 BatteryCheckIn tests should still pass; no new tests added for DashboardPage |

### NOT in v0.4 (deferred)

- **RLS migration to PostgreSQL** — promoted to its own dedicated Sprint 5. This needs Postgres to test against (SQLite doesn't have RLS), and warrants focused attention (RLS policies for every privileged read/write path, full re-test of the auth/dashboard/alert flows against the policies). Half-baking it inside Sprint 4 would be worse than deferring.
- Real Twilio / Resend / 360dialog integration — Sprint 6
- Token revocation list — Sprint 6
- Frontend tests for DashboardPage — Sprint 5
- Recharts chart for trend (currently a list) — Sprint 6
- Drill-down to individual identified check-ins from dashboard — Sprint 6
- Team Updates feature — Sprint 6
- Sentry / structured logging — Sprint 7

---

## Rule #1 disclosures for this sprint

1. **`pytest -v` ran in the build sandbox: 86/86 tests pass, ZERO warnings.** Verified end-to-end. The datetime cleanup eliminated 239 deprecation warnings; the test suite now runs clean.
2. **Comment encryption was empirically tested** for round-trip, unicode preservation (Hebrew + emoji), tamper detection (a single byte flip in the ciphertext fails the GCM tag), and wrong-key rejection.
3. **The ≥5 aggregation rule was empirically tested** for the boundary cases: 4 reports → role row exists but `avg=null, below_threshold=true`; 5 reports → `avg` populated. This is the architectural enforcement of UVP 1.
4. **The alert workflow was empirically tested** for every transition path: open→ack1→ack2→closed, and every invalid path (out of order, no note on close, re-ack a closed alert) returns 400 with `WORKFLOW_ERROR`.
5. **`npm test` was NOT run** (no Node in sandbox). Frontend tests not re-verified. The 9 BatteryCheckIn tests should still pass — the component itself is unchanged. No tests written for DashboardPage.
6. **No browser test of the dashboard UI.** Code looks correct but I haven't clicked through it. Most likely failure mode if anything is wrong: a snake_case/camelCase mismatch I missed.
7. **The encryption key deriviation uses BLAKE2b**, which means any non-empty string in `COMMENT_ENCRYPTION_KEY` works. **In production, the env var should be 64 hex chars from `secrets.token_hex(32)`.** The default placeholder string is explicitly refused in production via `_DEV_KEY_REFUSE_TOKENS`.
8. **No backfill migration for existing v0.3 plaintext comments.** v0.3 stored plaintext in `comment_ciphertext` (intentional flag-bug). If you have v0.3 dev data with comments, decrypt() will fail on those rows. Either (a) delete them, or (b) write a one-off backfill script that detects "looks like plaintext" rows and encrypts them in-place. Practical answer: delete `dev.db`. Documented this in the migration section below.
9. **The dashboard's `reporting_rate` excludes the synthetic DEV_MODE admin from the denominator.** Good — otherwise dev mode would show wrong percentages. Real production: nothing changes (no synthetic user exists).
10. **OTP code still prints to backend stdout.** Tagged `SECURITY:` in `auth_service.py`. Sprint 6 must remove this when wiring real Twilio/Resend.
11. **Token storage on the frontend is still localStorage** — XSS-vulnerable. Acceptable for pilot. Sprint 7 should re-evaluate.
12. **Rate limiter is still per-process in-memory.** Single-instance pilot only.

---

## How to run this end-to-end

### From scratch (fresh extract)

```powershell
# Place wellbeing-app-v0.4.zip + setup_dev_env.py side by side
python setup_dev_env.py

cd wellbeing-app\backend
.\venv\Scripts\Activate.ps1
flask db upgrade
$env:WELLBEING_DEV_MODE="true"
python run.py
```

```powershell
# In another terminal
cd wellbeing-app\frontend
npm install   # cryptography? no — that's Python. Frontend deps unchanged.
npm run dev
```

In DEV_MODE you land directly on the manager dashboard via the synthetic admin
(top-of-screen tab to switch to Check-in view).

### Try the alert ack flow

1. Switch to Check-in view.
2. Drag the battery to ≤24 (anywhere in the red zone) and Submit.
3. Switch back to Dashboard.
4. The alert appears under "Open alerts" with a "Mark seen" button.
5. Click through: Mark seen → Mark contacted → Close (with note).

### Try the privacy aggregation

1. As DEV_MODE admin, post a single check-in.
2. Switch to Dashboard. The "By role" section shows the admin row marked
   "below threshold (5)" with no average — privacy holds even for one report.
3. Manually create more identified users + check-ins via the Python REPL or
   sqlite3 to cross 5 reports for a role; the average appears.

### Run the auth flow without DEV_MODE

```powershell
$env:WELLBEING_DEV_MODE="false"
python run.py
```

Open the frontend → enter email → check the **backend stdout** for `[DEV OTP] ...` →
enter the code in the UI. You're now an `employee` user. The Dashboard tab is
hidden because you don't have manager/admin role.

To promote yourself to manager (until role-management UI exists in Sprint 6):

```powershell
cd wellbeing-app\backend
.\venv\Scripts\Activate.ps1
python -c "from app import create_app; from app.extensions import db; from app.models.user import User; app=create_app(); ctx=app.app_context(); ctx.push(); u=db.session.query(User).filter_by(contact_email='your@email').first(); u.role='manager'; db.session.commit(); print('Promoted', u.user_id)"
```

Refresh the frontend and the Dashboard tab appears.

### Test it

```powershell
cd wellbeing-app\backend
.\venv\Scripts\Activate.ps1
pytest -v
# 86 tests pass, 0 warnings
```

```powershell
cd wellbeing-app\frontend
npm test
# 9 tests should pass (NOT verified in build sandbox)
```

---

## Migration from v0.3

Drop the v0.4 zip over `wellbeing-app/`, overwrite. Then:

```powershell
cd wellbeing-app\backend
.\venv\Scripts\Activate.ps1
pip install -r requirements.txt    # adds the `cryptography` package
flask db upgrade                   # no new migrations, but safe to run
```

**If you have v0.3 dev data with comments**, the comment column was storing
plaintext. v0.4's decryption will fail on those rows. Easiest fix:

```powershell
del backend\dev.db
flask db upgrade   # re-applies both migrations on a fresh DB
```

Frontend `package.json` is unchanged from v0.3 — you can skip `npm install`.

---

## Suggested next sprint (Sprint 5 — focused: RLS migration)

**Theme: PostgreSQL Row-Level Security**

This is a dedicated, focused sprint because RLS is hard to do well and easy
to do wrong. Doing it right means:

1. Stand up Postgres locally (`docker compose up postgres`).
2. Switch `DATABASE_URL` to Postgres and re-run the full test suite. There
   will be SQLite-vs-Postgres differences (e.g., the `JSONB` opportunity for
   audit `meta_json`, more strict type coercion). Fix as found.
3. Write a new migration `0003_rls_policies.py` that:
   - Enables RLS on `users`, `checkins`, `alerts`, `team_updates`,
     `notifications`, `audit`, `consent_log`
   - Defines policies:
     - `users`: read self; managers/admins read everyone; admins write
     - `checkins`: read own (identified); managers read own department
       (identified or aggregate); employees never read others'
     - `alerts`: managers read department; admins read all
     - etc.
   - Sets up a per-request "session role" via `SET LOCAL` so the connection
     pool can serve multiple users
4. Update the Flask app to set `SET LOCAL app.user_id = '...'` and
   `SET LOCAL app.user_role = '...'` on every request inside the auth
   middleware (after auth resolves).
5. Add tests that verify RLS:
   - With `app.user_role='employee'`, `SELECT * FROM checkins` returns
     only own rows
   - Cross-user data leak attempt fails
6. Document the rollback path.

This is a 1.5–2 week sprint if done properly. Don't rush it.

---

## Handoff checklist for next agent / next sprint

- [ ] Read `CLAUDE.md` (full)
- [ ] Read this `HANDOFF.md` (full)
- [ ] Run `pip install -r requirements.txt` (cryptography is new in v0.4)
- [ ] Run `pytest` — 86 tests should pass
- [ ] Verify the dashboard works in DEV_MODE in the browser
- [ ] Verify the alert ack flow works end-to-end (check-in <25 → ack steps)
- [ ] Verify the privacy aggregation: <5 reports per role → no avg shown
- [ ] Read `app/services/dashboard_service.py` — understand the threshold logic before extending
- [ ] Read `app/utils/crypto.py` and `app/services/check_in_service.py._encrypt_comment` — understand the encryption seam before changing it
- [ ] Update this `HANDOFF.md` at the end of the next sprint
