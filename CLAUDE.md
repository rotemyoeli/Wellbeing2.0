# CLAUDE.md

> Project root context for Claude Code. **Read this first, every session.**
> Last updated: 2026-04-29 | Doc version: 0.5 (Sprint 4 / v0.4)

---

## Rule #1 — Objective truth only

This rule overrides everything else in this file.

- Never sugarcoat. Don't present things as "almost working" when they're not.
- If not verified against docs — say so.
- If copying code/patterns without checking — say so.
- If a fix may cause follow-up issues — say upfront.
- If unsure — say "don't know."
- If you broke something — own it.
- If a process is inefficient — say so.
- This rule must appear in every `HANDOFF.md` you write.

---

## Project at a glance

**Working name:** `wellbeing-app` (rename when finalised)
**Product:** Employee well-being pulse-check web app for medical ward staff
**Pilot site:** Internal Medicine Ward B, Soroka University Medical Center, Beersheba
**Owner organisation:** Machava Association, Beersheba Development Center
**Current phase:** Sprint 1 — Dev scaffold (v0.1)
**Current version:** 0.1.0

**One-line description:** A privacy-first, mobile-first PWA that lets shift-based clinical staff report energy/wellbeing in under 15 seconds, surfaces aggregated trends and threshold alerts to ward managers, and closes the loop with visible "what we did about it" team updates.

---

## Tech stack — DEVIATION FROM SPEC v2

**Spec v2 §10 recommended Option C:** Supabase + Vercel + Deno Edge Functions + React.

**Sprint 1 chose: Flask + React + Vite + SQLAlchemy.** See `docs/04_technical/01_ADR_Stack_Decision.md` for the full rationale.

| Layer | Choice | Why |
|---|---|---|
| Backend runtime | **Flask 3.x (Python 3.11+)** | Matches Rotem's Sentiero + Lumira pattern; PyCharm support; same student-team has shipped Flask before |
| ORM | **SQLAlchemy 2.x + Flask-SQLAlchemy** | Standard; ORM-portable across SQLite/PostgreSQL |
| Migrations | **Alembic via Flask-Migrate** | Standard |
| Auth | **Flask-JWT-Extended** | Custom OTP flow planned; SSO bridging in Sprint 2+ |
| DB (dev) | **SQLite** | Fast local iteration; matches Lumira pattern |
| DB (prod) | **PostgreSQL 15+** | Required for RLS — the architectural anonymity guarantee depends on this |
| Frontend | **React 18 + TypeScript + Vite 6** | Matches Spec v2 + matches Rotem's React expertise |
| Styling | **TailwindCSS 3.x** | Matches Spec v2 |
| PWA | **vite-plugin-pwa (workbox)** | Matches Spec v2 |
| State | **Zustand** | Matches Spec v2 |
| Charts | **Recharts** (Sprint 2+) | Matches Spec v2 |
| Hosting (planned) | **Railway** for backend, Railway/Vercel for frontend | Matches Rotem's infra; pending Q2 Soroka IT approval |

**Critical caveat:** RLS (Row Level Security) is a PostgreSQL-only feature. SQLite is acceptable for local dev iteration but **all RLS policies must be tested against PostgreSQL before any pre-production deployment.** The data model uses tenant-aware foreign keys so RLS can be added cleanly in Sprint 4+.

---

## Critical constraints (do not negotiate without explicit approval)

| Constraint | Reason | Where defined |
|---|---|---|
| **Mobile-first PWA** | Staff use phones during short breaks | Spec v2 §4.1, §10 |
| **<15s end-to-end check-in** | Adoption requirement, not preference | Spec v2 §11, KPI table |
| **Anonymous mode must be technically irreversible** | Trust gate | Spec v2 §6 FR-02 |
| **Israeli Privacy Law Amendment 13** | Effective 14 Aug 2025; hospitals = mandatory DPO | Verified via IAPP, Pandectes, Recording Law (April 2026) |
| **Aggregation threshold ≥5** | Below 5, ward-level aggregate only | Spec v2 §6 FR-05 |
| **Closed feedback loop ("Team Updates")** | Without it, participation drops 60%+ in 3 months | Spec v2 §1.1 |
| **English only in docs and code** | Standing instruction | Standing instructions |
| **PostgreSQL for production** | RLS required for architectural anonymity | This file |

---

## Repository structure (current)

```
wellbeing-app/
├── CLAUDE.md                      ← you are here
├── HANDOFF.md                     ← current sprint state
├── README.md                      ← developer setup
├── .gitignore
├── .env.example                   ← env vars (every required var documented)
├── docker-compose.yml             ← optional Postgres for dev
├── docs/
│   ├── 00_existing/               ← (placeholder for original Spec v2 + Doc 01)
│   ├── 01_strategy/
│   │   ├── 01_Competitive_Analysis.md
│   │   └── 02_Differentiation_and_Positioning.md
│   ├── 04_technical/
│   │   └── 01_ADR_Stack_Decision.md     ← stack choice rationale
│   └── 07_project/
│       └── 01_Open_Questions_Log.md
├── backend/
│   ├── app/
│   │   ├── __init__.py            ← Flask app factory
│   │   ├── config.py              ← config classes (Dev/Test/Prod)
│   │   ├── extensions.py          ← db, migrate, jwt, cors instances
│   │   ├── models/                ← SQLAlchemy models
│   │   │   ├── __init__.py
│   │   │   ├── user.py
│   │   │   ├── checkin.py
│   │   │   ├── alert.py
│   │   │   ├── shift.py
│   │   │   ├── team_update.py
│   │   │   ├── notification.py
│   │   │   ├── audit.py
│   │   │   └── consent_log.py
│   │   ├── api/
│   │   │   ├── __init__.py        ← blueprint registration
│   │   │   ├── health.py          ← GET /api/v1/health (working)
│   │   │   ├── auth.py            ← stub (DEV_MODE bypass)
│   │   │   └── checkins.py        ← stub for Sprint 2
│   │   ├── services/              ← business logic (empty in v0.1)
│   │   ├── utils/
│   │   │   └── anon_token.py      ← architectural anonymity primitive
│   │   └── middleware/
│   │       └── dev_mode.py        ← WELLBEING_DEV_MODE auth bypass
│   ├── migrations/                ← Alembic
│   ├── tests/
│   │   ├── conftest.py
│   │   └── test_health.py
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── run.py                     ← `python run.py` to start
├── frontend/
│   ├── package.json
│   ├── vite.config.ts
│   ├── tsconfig.json
│   ├── tailwind.config.js
│   ├── postcss.config.js
│   ├── index.html
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   └── icons/                 ← (empty; add real icons before launch)
│   └── src/
│       ├── main.tsx
│       ├── App.tsx
│       ├── index.css
│       ├── components/
│       │   └── BatteryCheckIn.tsx ← the core UI component
│       ├── pages/
│       │   └── HomePage.tsx
│       ├── lib/
│       │   └── api.ts              ← API client
│       └── types/
│           └── index.ts
└── scripts/
    └── (helper scripts; empty in v0.1)
```

---

## Conventions

### Communication
- **English only** in all docs, code, comments, and chat. Even if Rotem writes in Hebrew.
- **Plain language over legal jargon** in user-facing copy.
- **Direct over diplomatic.** See Rule #1.

### Sprint packaging
After each sprint, package all changed files into a single zip with a version number, preserving relative directory structure. Versioning: `v0.MAJOR.MINOR` semver-lite during pre-launch.

### File naming
- Docs: `NN_Title_In_Snake_Case.md`
- Python: `snake_case.py`
- TS: `camelCase.ts` for utilities, `PascalCase.tsx` for components
- Migrations: Alembic auto-generated `revisionhash_description.py`

### Dev mode backdoor
```bash
WELLBEING_DEV_MODE=true   # bypass auth, grant admin role
```

**This MUST be removed (or set to `false`) before any pilot user touches the system.** Track removal in pre-launch checklist. The backdoor is implemented in `backend/app/middleware/dev_mode.py` — search for `DEV MODE BACKDOOR` to find every reference site (intentionally tagged).

### Commit messages
`type(scope): description` — types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `security`. The `security` type triggers extra review.

### Dependencies
- Pin major versions in `requirements.txt` and `package.json`; let minors float.
- Run `pip install -r requirements-dev.txt` for the full dev tooling (ruff, black, pytest).
- Frontend: `npm install` reads `package.json` directly.

---

## Common gotchas (read before coding)

1. **Anonymous reports cannot be re-identified.** The `anon_token` is a one-way hash of `(user_id + date + salt)`. See `backend/app/utils/anon_token.py`. Do not store anything that could allow reverse lookup.
2. **Aggregation threshold ≥5 enforced at the query layer.** Service-layer query helpers must add this filter. UI-layer is not enough.
3. **iOS push needs iOS 17+.** Older iPhones get badge-only fallback or SMS. Don't rely on push as the primary alert channel.
4. **WhatsApp Business needs opt-in + BSP-approved templates.** 360dialog or Twilio. Templates must be pre-approved by Meta. Plan for SMS fallback always.
5. **Soft delete only.** Set `is_active=false`; never physically `DELETE` rows except on Article 15 erasure request. This is for audit compliance.
6. **No PII in URLs.** Ever. Sensitive filters go in the `X-Filter` header (encrypted). URL params are logged everywhere.
7. **Manager dashboard is aggregate-by-default.** Drill-down only available for *identified* check-ins, and only for managers with explicit RBAC permission.
8. **SQLite vs PostgreSQL.** SQLite is fine for local dev. Production requires PostgreSQL — RLS won't work otherwise. Test the RLS policies against PostgreSQL via `docker compose up postgres` before any pre-prod deploy.

---

## What NOT to do

- ❌ Don't add gamification (streaks, badges, leaderboards) without explicit approval.
- ❌ Don't claim or imply the system "prevents burnout" or "diagnoses" anything.
- ❌ Don't use ML/burnout prediction in MVP. Out of scope.
- ❌ Don't integrate with EHR / HIS in MVP.
- ❌ Don't store IP addresses unhashed. Per Amendment 13 they are personal data.
- ❌ Don't deploy to non-Israeli/non-EU regions without explicit approval.
- ❌ Don't write Hebrew text in code, commit messages, or docs.
- ❌ Don't skip the audit log on any manager/admin action.
- ❌ Don't remove the DEV_MODE warning checks before production (see `backend/app/middleware/dev_mode.py`).

---

## Status snapshot

- [x] Spec v2 written (March 2026)
- [x] Document 01 — Market Research written (April 2026)
- [x] Round 1 docs (foundation pack)
- [x] Sprint 1 — v0.1 dev scaffold
- [x] Sprint 2 — v0.2: working check-in + alerts
- [x] Sprint 3 — v0.3: real auth (OTP/JWT) + audit + rate limit + frontend login
- [x] **Sprint 4 — v0.4: manager dashboard + alert ack workflow + comment encryption + datetime cleanup (this round)**
- [ ] Phase 0 organisational sign-offs (Q1, Q2, Q5, Q7 — blocking deploy, not blocking dev)
- [ ] DPIA drafted and approved
- [ ] Stack final decision (currently provisional Flask+React, see ADR)
- [ ] Sprint 5 — RLS migration to PostgreSQL (dedicated focused effort)
- [ ] Sprint 6 — Notifications (Twilio + Resend + 360dialog) + PWA push + Team Updates feature
- [ ] Sprint 7 — Pen-test prep + production hardening
- [ ] Sprint 8+ — Pilot

For live status of each open question see `docs/07_project/01_Open_Questions_Log.md`.
