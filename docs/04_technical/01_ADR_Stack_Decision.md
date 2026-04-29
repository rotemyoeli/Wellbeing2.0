# ADR-001 — Tech Stack Decision: Flask + React (deviation from Spec v2 Option C)

> **Status:** Accepted (provisional, pending Q2 — Soroka IT hosting approval)
> **Date:** 2026-04-29
> **Decision-maker:** Rotem (lead dev) + Claude (Sprint 1 build)
> **Supersedes:** Spec v2 §10.1 recommendation of Option C (Supabase + Vercel)

---

## Context

Spec v2 §10 evaluated three stack options and recommended **Option C — Supabase + Vercel + Deno Edge Functions** for ergonomics, low-DevOps overhead, and student-friendliness. The Spec also kept **Option B — NestJS + PostgreSQL on Azure** as a fallback if Soroka IT mandates Microsoft-only hosting.

In Sprint 1, two factors changed the calculus:

1. **The lead developer's existing pattern.** Rotem's two parallel projects (Sentiero, Lumira) both use Flask + React + SQLite/PostgreSQL on Railway. He works in PyCharm on Windows with PowerShell. Spec v2 was written before the lead-dev pattern was the dominant practical constraint.
2. **Q2 (hosting approval) is still open.** Building on Supabase before Q2 is answered risks rewriting if Soroka IT mandates Azure-only. Building on a stack-portable foundation (Flask + SQLAlchemy + PostgreSQL) keeps both deployment paths viable.

## Decision

Build Sprint 1 (and successive sprints until Q2 closes) on:

- **Backend:** Flask 3.x (Python 3.11+) + SQLAlchemy 2.x + Flask-SQLAlchemy + Flask-Migrate + Flask-JWT-Extended + Flask-CORS
- **DB:** SQLite for dev; PostgreSQL 15+ for staging/production
- **Frontend:** React 18 + TypeScript + Vite 6 + TailwindCSS 3 + Zustand
- **PWA:** vite-plugin-pwa (workbox)
- **Hosting (planned):** Railway (matches Rotem's infrastructure) — pending Q2

## Rationale

### Why deviate from Option C (Supabase)

| Reason | Impact |
|---|---|
| Lead-dev expertise is in Flask, not Deno Edge Functions | Faster iteration in Sprint 1–4; lower defect rate from learning-curve mistakes |
| Existing Sentiero + Lumira deployment patterns are Flask + Railway | Operational continuity; same monitoring, same deployment scripts |
| PyCharm has best-in-class Python support | Direct user request; productivity multiplier |
| Q2 (hosting) is open — Supabase Cloud is US-hosted by default | Amendment 13 cross-border transfer risk; building on a portable backend de-risks the decision |
| Junior students mentioned in Spec v2 §3 are more likely to be familiar with Python than Deno | Lower onboarding cost for student devs joining mid-project |

### Why NOT pick Option B (NestJS) either

| Reason | Impact |
|---|---|
| TypeScript everywhere sounds nice, but doubles the "two languages to fluently maintain" cost for the team | Practical overhead |
| NestJS is more complex than Flask for a project this size | Over-engineering risk |
| Same hosting question (Q2) applies to NestJS — it doesn't simplify the deploy decision | No advantage gained |

### Why Flask is sufficient

Spec v2 Option C's core advantages were: managed Postgres, built-in auth, real-time, RLS out-of-the-box. The Flask alternative provides:

| Spec v2 Option C feature | Flask equivalent |
|---|---|
| Supabase managed PostgreSQL | Railway PostgreSQL or AWS RDS or Azure Database for PostgreSQL |
| Supabase Auth (magic link, OTP, JWT) | Flask-JWT-Extended + custom OTP via Twilio/Resend (Sprint 2) |
| Supabase Realtime | WebSockets via `flask-socketio` if needed (likely not needed in MVP — dashboard refresh on request is fine) |
| Postgres RLS built-in | Postgres RLS (same DB engine; same RLS) — must be applied via Alembic migration in Sprint 4 |
| Edge Functions (Deno) | Flask routes (same logical role) |

The architectural anonymity guarantee (UVP 1 in `02_Differentiation_and_Positioning.md`) does NOT depend on which framework wraps PostgreSQL. The hash function (BLAKE2b in `app/utils/anon_token.py`) and the query-layer aggregation thresholds work identically in either stack.

## Consequences

### Positive

- **Stack-portable.** Backend is Flask + SQLAlchemy + PostgreSQL, which runs on any cloud Soroka IT eventually approves (Railway, AWS, Azure, GCP, on-prem).
- **Faster Sprint 1–3 velocity** for the current dev team.
- **Operational continuity** with Rotem's existing two projects — same deploy scripts, same monitoring, same incident-response muscle memory.
- **Lower onboarding cost** for new student devs.

### Negative

- **No Realtime out of the box.** If Spec v2 §14.1 "alert latency <2 min" requires push to manager dashboards, we'll need either WebSockets or a polling pattern. WebSockets is fine but adds operational complexity.
- **Auth is from-scratch.** Supabase Auth would have shipped magic-link/OTP in 30 minutes. Flask-JWT-Extended + custom OTP is a Sprint 2 task (~1–2 days).
- **No built-in BaaS conveniences** (file storage, edge cache). Likely irrelevant for this use case (we don't store files; CDN is via Vercel/Railway frontend hosting).
- **Two repos / two language ecosystems** to maintain (Python + TypeScript). This was true of Option C as well — Deno is JS-family but the operational toolchain still differs.

### Operational / DevOps consequences

- Need a deploy pipeline (likely Railway native or GitHub Actions → Railway).
- Need a Dockerfile for the backend (or use Railway's nixpacks).
- Need to run migrations as a deploy step (`flask db upgrade`).
- Need a separate frontend hosting (Railway static site or Vercel — both are fine).

### Compliance consequences

- Amendment 13 obligations are framework-independent. The DPO conversation (Q7), DPIA, consent flow, audit log, retention/erasure workflows are all unchanged.
- Cross-border transfer rules (Amendment 13 international transfer chapter) are dependent on **where we host**, not what framework. Railway has a EU region; Israel-region cloud options should be evaluated against Q2.

## Alternatives considered

| Alternative | Why rejected |
|---|---|
| **Spec v2 Option C — Supabase + Vercel** | Lead-dev unfamiliarity; cross-border data residency risk pending Q2; Deno toolchain unfamiliar to student devs |
| **Spec v2 Option B — NestJS + PostgreSQL + Azure** | NestJS adds complexity without solving the dev-team-fit problem; Azure-specific commit when Q2 is open |
| **Django** | Heavier than needed; ORM is fine but Flask is closer to Rotem's existing pattern |
| **FastAPI** | Genuinely tempting (async, auto OpenAPI, modern). Rejected because Rotem's existing projects are Flask-based; switching adds learning cost without proportionate benefit at this scale. **Worth re-evaluating in v2 if performance becomes a constraint.** |
| **Plain SQL + raw Postgres** | Too much glue code for the team size; SQLAlchemy 2 is a sensible level of abstraction |

## Triggers for revisiting this decision

This ADR is **provisional** and should be re-evaluated if any of these happen:

- Q2 closes with Soroka IT mandating a specific stack (e.g., Azure-only with Entra ID SSO that prefers a Microsoft framework)
- Performance constraints emerge in pilot that Flask cannot meet (highly unlikely at <100 concurrent users)
- Team composition changes (e.g., 5 student devs join who all know NestJS)
- A regulatory requirement emerges that's easier to satisfy on Supabase (e.g., a specific audit-log compliance integration)

## References

- `docs/00_existing/Wellbeing_Spec_v2_EN.docx` §10 — original stack evaluation
- `docs/07_project/01_Open_Questions_Log.md` Q2 — hosting approval question
- `docs/01_strategy/02_Differentiation_and_Positioning.md` UVP 1 — architectural anonymity (framework-independent)
