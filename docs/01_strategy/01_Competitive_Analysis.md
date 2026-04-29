# 01 — Competitive Analysis Deep Dive

> Doc version: 0.1 | Last updated: 2026-04-29
> **Purpose:** Map the competitive landscape with enough specificity to make sharp product-design choices. Generic "we have a dashboard too" comparisons are not useful.
> **Disclaimer per Rule #1:** Pricing data below is approximate — most enterprise platforms quote-only. Treat all $ figures as ranges, not commitments. Verified vendor facts are cited inline; everything else is best-effort inference and should be re-checked before being used in funding decks or procurement.

---

## 1. Executive summary

The competitive landscape splits cleanly into three segments, with very different threat profiles for this product:

| Segment | Threat to this product | Reason |
|---|---|---|
| Generic engagement & pulse-survey platforms (TINYpulse, WorkTango, Culture Amp, Microsoft Viva Glint, Lattice, 15Five, Workleap/Officevibe, Workday Peakon) | **Low for the wedge, high for v2+ scale** | Built for office-rhythm, multi-purpose engagement. Not designed for shift-based clinical staff. But hospitals with existing enterprise contracts may bundle them in by default. |
| Healthcare-specific workforce platforms (Press Ganey, Laudio, ANCC/Magnet survey tools) | **Medium — but they play upstream** | Press Ganey owns the validated-survey + benchmarking franchise; Laudio plays in operations / nurse-leader workflow. Neither offers a sub-15-second daily ward-level pulse with anonymity-first design. The wedge is real. |
| Israeli employee-engagement & wellness startups (Eloops, Flexity, Fijoya, BetterTogether) | **Low for clinical staff** | None target hospital wards or shift-based clinical work. Eloops is gamification-led; Flexity is benefits-led; Fijoya is benefits-marketplace. The Israeli clinical-staff-pulse niche is empty as of April 2026 (extent of search). |

**The strongest strategic finding:** *every* generic player relies on weekly/monthly cadence, fixed reminders, and a participation-gamification approach. *None* design for shift fragmentation, and *none* commit to a hard anonymity guarantee that survives a curious manager. This is the wedge.

**The strongest strategic risk:** if a hospital is already a Press Ganey customer (very common in US hospitals; growing in Israeli hospitals through international affiliations), Press Ganey's engagement module may be pushed as the "good enough" default, even though it is not optimised for ward-level real-time pulse. The differentiation has to be sharp and clinical-context-aware to overcome procurement inertia.

---

## 2. Methodology & scope

**Scope:** Software products that touch employee wellbeing, engagement, pulse-feedback, or workforce sensing in 2025–2026, with priority to those any Israeli hospital might encounter via direct sales, international affiliation, or system integration.

**Out of scope:** EAP / therapy apps (Calm, Headspace for Work, Lyra, Spring Health), generic HRIS (Workday, BambooHR, Hibob), wellness benefits marketplaces (Fijoya, BenePass, Compt), B2C wellness apps. Mentioned briefly only when relevant.

**Sources used:**
- Vendor websites and product pages (April 2026)
- G2, Capterra, GetApp, SelectHub, Gartner Peer Insights, SaaSworthy review sites
- Press Ganey published reports (2024 nurse work environment, 2026 State of Healthcare Safety, nurse resilience)
- Laudio + AONL "Early Warning System for Nurse Burnout" report (Oct 2025)
- IAPP, Pandectes, Recording Law, Lexology, Chambers 2026 guide for Israeli regulatory landscape
- The original `Document_01_Market_Research_Industry_Landscape_Wellbeing_App.docx` (April 2026)

**What is NOT in this analysis:** vendor-private documents, pen-test results, contract terms, or any insider information from competitor employees.

**Currency of data:** April 2026. Pulse-survey vendors iterate quickly; treat feature lists as a snapshot.

---

## 3. Segment 1 — Generic engagement & pulse-survey platforms

These are the dominant category players. They all share a similar shape: pulse surveys + dashboards + recognition + (sometimes) goals/performance. Pricing is usually per-employee per month, quote-only above small-team tiers.

### 3.1 TINYpulse (now part of WorkTango ecosystem in some configurations)

**Founded:** 2012 (Seattle). Pioneer of the "pulsing" cadence — short, frequent, anonymous-by-default surveys.

**What it does well:**
- True anonymity-by-default with two-way anonymous reply (the manager can ask a follow-up question without unmasking the responder).
- Lightweight pulse cadence (weekly or bi-weekly).
- Recognition feed (Cheers for Peers).

**What it does poorly for our use case:**
- Desktop-first UI. Mobile experience is acceptable but not optimised for one-handed operation under time pressure.
- No shift-awareness. Reminders are calendar-based.
- Gamified recognition feed can feel performative — risky in a clinical setting.
- Reviewers report a "clunky" UI for new feature rollouts and lack of advanced analytics.

**Pricing (approximate):** Per-employee/month; review sites suggest $5–15 USD range depending on tier and bundle. Quote-only at scale.

**Lessons to steal:**
- Anonymous follow-up reply mechanism — a one-way anonymous channel that still allows manager dialogue.
- Pulse cadence philosophy: short, frequent, low-burden.

**What to deliberately do differently:**
- No public recognition feed in MVP. Recognition theatre is wrong for clinical context.
- Fully mobile-first, not "responsive desktop."

### 3.2 WorkTango (formerly Kazoo)

**What it does well:**
- Combined surveys + recognition + rewards + insights in one platform.
- AI-generated action plans based on survey responses (newer feature, marketed in 2025–2026).
- Strong customer-support reputation.
- Multi-language support (10+ languages including Hebrew? — needs verification).

**What it does poorly for our use case:**
- Heavy on recognition/rewards — orthogonal to clinical wellbeing.
- Points-based reward system with expiration ("use it or lose it") is a recurring user complaint.
- Designed for mid-to-large enterprises; the platform is broad, not deep on any single workflow.

**Pricing:** Quote-only. G2 score 4.6/5. Notable customers: HUB, KIA, Goodwill.

**Lessons to steal:**
- Combining sensing + manager guidance ("AI action plans") in the same product. The "what should I do about this trend" UX is genuinely useful for managers — though we should NOT use AI-generated suggestions in MVP (Amendment 13 disclosure burden + clinical-context risk).

**What to deliberately do differently:**
- No rewards/points system. Wellbeing is not a points-earning activity in clinical context.

### 3.3 Culture Amp

**What it does well:**
- Strong validated-survey science and benchmark database (mid-size and enterprise dominant).
- Comprehensive employee-experience suite.
- Mature analytics, action planning, and goal alignment.

**What it does poorly for our use case:**
- Comprehensive = heavy. Implementation is a project; the per-staff-member experience is survey-centric, not pulse-centric.
- Designed for HR-led programs, not ward-level operational sensing.
- Pricing skews enterprise (often $5K–25K+ minimum annual commit per published reports).

**Lessons to steal:**
- The benchmark database concept — over time, this product could build *its own* benchmark across Israeli hospital wards if multi-tenant arrives. Worth designing the data model to permit (de-identified) cross-ward benchmarking later.
- Action-plan workflow attached to survey results.

**What to do differently:**
- Don't ape the survey-program model. We are a sensor + alert + close-the-loop system, not a survey program.

### 3.4 Microsoft Viva Glint (formerly Glint, acquired by LinkedIn → Microsoft)

**What it does well:**
- Embedded in Microsoft 365 / Teams, which is huge for adoption in Microsoft-shop hospitals.
- Solid employee lifecycle survey science.
- Integration with Microsoft Viva ecosystem (Insights, Learning, Goals).

**What it does poorly for our use case:**
- Requires Microsoft 365 commitment. Hospital staff may not be in M365.
- Manager-centric reporting, not staff-centric pulse.
- Mobile experience is improving but is not the primary design centre.

**Strategic threat level:** Medium-to-high *if* Soroka is a Microsoft 365 customer with Viva entitlements. Procurement may push "you already have Viva, why build?" — answer must be ready: clinical context, anonymity guarantees, shift design, regulatory localisation.

**Lessons to steal:**
- The "embedded in the daily tools" philosophy. Our equivalent is the PWA install + push notifications.

### 3.5 Workday Peakon Employee Voice

**What it does well:**
- Rich analytics with NLP on open comments.
- Workday integration (HRIS data joined with survey responses for segmentation — though this is also the privacy concern).
- Manager-action workflow.

**What it does poorly for our use case:**
- Privacy posture is "trust us" rather than architecture. HR-data-meets-survey-data is the opposite of what a hospital ward wants.
- Not mobile-first.
- Enterprise pricing.

**Lessons to steal:** The drill-down from theme → topic → comment pattern is solid UX for manager dashboards; but only on identified data, with clear consent.

**What to do differently:** Hard separation between identity and check-in content for anonymous mode. Architecture, not policy.

### 3.6 15Five

**What it does well:**
- Weekly check-in workflow with priorities + blockers + wellbeing rating — the "high five" mechanic is well-known.
- Strong manager-employee 1:1 features.
- Continuous performance management adjacent.

**What it does poorly for our use case:**
- "15 minutes per week" target is way too long for a clinical floor.
- Manager-employee 1:1 model assumes office work and visible reporting structure.

**Lessons to steal:** The "5 minutes to fill out, 1 minute to read" framing. We push that to "<15 seconds to fill out."

### 3.7 Lattice

**What it does well:**
- Performance + engagement + growth in one place.
- Pulse + 1:1 + goals integrated.
- Strong mid-market presence.

**Threat level:** Low for clinical wedge. Designed for tech / professional services companies.

### 3.8 Workleap (formerly Officevibe)

**What it does well:**
- Lightweight pulse surveys with peer recognition.
- Manager-coaching content built in.
- Reasonable pricing for SMB.

**Threat level:** Low. Same office-rhythm assumption.

---

## 4. Segment 2 — Healthcare-specific workforce platforms

This is where the strategic threat is real, because these vendors actually understand healthcare.

### 4.1 Press Ganey

**What they are:** The dominant healthcare experience-and-workforce data company. Core franchise is patient-experience surveys and benchmarking; expanded into employee experience, safety culture, and nursing-specific workforce instruments (NDNQI, etc.).

**Recent scale signals:**
- 2026 *State of Healthcare Safety* report drew on 2025 data from **1.3 million healthcare employees across 225 health systems and 3,846 facilities**, plus 23.5M patients.
- Their 2024 nurse work environment analysis used data from ~115,000 RNs and APRNs.
- Long-standing partnerships with the DAISY Foundation, ANCC, AONL, AAACN, ANA — they own the institutional channel.

**What they do well:**
- Validated, science-backed survey instruments (the Mayo Well-Being Index family is offered through Press Ganey relationships).
- Benchmarking against thousands of facilities — a hospital can see "our nurse engagement is at the 27th percentile."
- Connects employee data to patient-safety outcomes ("disengaged employees are 2.6× more likely to leave," "high-trust orgs are 50–80% more likely to outperform on safety").
- Deep clinical-leadership credibility.

**What they do poorly for ward-level real-time pulse:**
- Their cadence is fundamentally **annual + interim pulses**, not daily/per-shift sensing. The unit of observation is "engagement program," not "today's energy."
- The product is built for hospital executives and CHROs, not ward managers in real time.
- Mobile experience exists but is not the design centre.
- High implementation cost; quote-only enterprise pricing typically in 5- to 6-figure annual commits.

**Strategic implication:** Press Ganey is a *complement*, not a competitor — but they will be perceived as a substitute by procurement if the differentiation is not crisp. The right framing is: "Press Ganey tells you where your hospital ranks once or twice a year. We tell you whether the night shift is collapsing this week, anonymously, in <15 seconds, with a closed action loop." These are different products.

**Lessons to steal:**
- The connection of workforce data to outcome metrics. Long-term, this product should be able to surface "wards with consistent low energy → higher safety incidents" — *only* with proper aggregation thresholds and only as an organisational signal, never an individual one.
- Validated-instrument credibility. Even though our daily mechanic is the battery (1 question), an optional periodic Mayo Well-Being Index pulse should be considered for v2.

### 4.2 Laudio

**What they are:** A workflow platform for nurse leaders. Operations layer — helping nurse managers act on team data, span-of-control, recognition, and intervention timing.

**Recent scale signals:**
- October 2025 report with the American Organization for Nursing Leadership (AONL): "An Early Warning System for Nurse Burnout: Metrics and Strategies" — drawing on **~100,000 nurses across 150+ hospitals**.
- Identified 8 measurable operational predictors of burnout (e.g., "consistently leaving work late," "skipping breaks more than 8% of shifts," "no PTO for 6+ months").

**What they do well:**
- Operationally embedded — designed to live inside the nurse manager's day, not as a survey afterthought.
- Strong leadership franchise via AONL partnership.
- Predictive metrics rooted in operational data (timekeeping, schedule), not just survey responses.

**What they do poorly for our use case:**
- It's a **manager-leader product**, not a staff-pulse product. The staff member is largely passive; signal is inferred from operational data, not directly reported.
- US-centric (timekeeping integrations, hospital systems).
- No anonymous direct-voice-of-staff channel that we've found.

**Strategic implication:** Laudio occupies the manager-workflow layer. This product occupies the staff-voice layer. Both could coexist in a hospital, but if Laudio expands into direct staff feedback, the overlap grows. **Watch this vendor carefully** — they are the closest in spirit to what we are building, just from the other direction.

**Lessons to steal:**
- Operational-predictor metrics from real shift data (overtime, missed breaks, no PTO). Even without a Laudio integration, our system could *eventually* correlate self-reported energy with shift-schedule patterns — once Q4 (shift schedule data) is resolved.
- The AONL-style report-with-named-co-author content marketing is a powerful credibility play. For Israel, a partnership with an Israeli nursing or medical association (e.g., the Israel Nurses Association — ההסתדרות הרפואית בישראל) could play the same role.

### 4.3 Other healthcare-adjacent platforms

- **NurseGrid** — primarily shift-management for nurses; not a wellbeing tool but a candidate integration for Q4.
- **Epic clinician wellness modules** — embedded in Epic EHR; gated by Epic deployment. Soroka uses Chameleon (Israeli EHR), so this is not an immediate threat.
- **DAISY Foundation digital tools** — recognition-focused, not pulse.
- **Hospital-internal tools** — many large hospitals have built internal staff-pulse instruments (often homegrown or contracted). These are invisible to public market research; a direct conversation with Soroka HR/Operations is the only way to surface them.

---

## 5. Segment 3 — Israeli market

Searched April 2026. The findings are notable for their *absence*:

- **Eloops** — Tel Aviv-based employee engagement platform. Gamification-led (coins, rewards, quizzes). Founded 2017. Customers include Coca-Cola Israel, Hertz Israel, Israel Electricity Authority. **Not designed for clinical staff.**
- **Flexity** (Tel Aviv) — Data-driven corporate wellbeing programs. **Not a pulse platform.**
- **Fijoya** (Tel Aviv, founded 2023, $8.3M raised from Team8 + Viola) — Employee-benefits marketplace. **Not in the wellbeing-sensing category.**
- **BetterTogether** — Social wellness for weight loss / fitness. **B2C-leaning.**
- **PraisePal** — Recognition platform; some Israeli/global mix. **Not clinical.**
- **Healthcare-specific Israeli vendors targeting hospital staff wellbeing:** **none found** as of April 2026.

**Strategic implication:**

The Israeli clinical-staff wellbeing-sensing niche is open. The reasons for the gap are reasonable: (a) hospitals are slow buyers, (b) Amendment 13 raised the compliance bar substantially in August 2025, (c) the niche is small for a startup but large for a non-profit / association-driven project. Machava Association's structure (non-profit, association, mission-driven) is actually well-suited to this gap.

**Caveat per Rule #1:** Absence of evidence is not evidence of absence. Hospital-internal tools and stealth-mode startups may exist. Before claiming "first to market," do a direct call-out to:
1. Soroka IT and HR — is there an internal tool already?
2. Ministry of Health digital health team — any national initiative?
3. Israel Innovation Authority HealthTech beneficiaries 2024–2026.

---

## 6. Feature comparison matrix

A snapshot. Cells marked "—" mean: feature not present, or not central to the offering. **Cells marked "?"** mean we haven't verified.

| Capability | TINYpulse | WorkTango | Culture Amp | Viva Glint | Peakon | 15Five | Press Ganey | Laudio | **This product (target)** |
|---|---|---|---|---|---|---|---|---|---|
| Anonymous-by-default pulse | ✓ | ✓ | ✓ (segment-level) | ✓ | ✓ | — | ✓ | — | ✓ + irreversible by design |
| <15-second mobile check-in | — | — | — | — | — | — | — | — | ✓ |
| Shift-aware reminders | — | — | — | — | — | — | — | — (passive only) | ✓ |
| PWA installable, no app store | — | — | — | — | — | — | — | — | ✓ |
| Push notifications (web) | partial | partial | partial | ✓ via Teams | partial | partial | — | — | ✓ |
| WhatsApp Business reminder | — | — | — | — | — | — | — | — | ✓ (pending Q11) |
| Configurable threshold alerts | partial | partial | partial | partial | ✓ | partial | partial | ✓ | ✓ |
| Multi-step alert acknowledgment (Seen → Contacted → Closed) | — | — | partial | partial | partial | — | partial | ✓ | ✓ |
| Manager "Team Update" closed-loop publish | — | partial | partial | partial | partial | — | — | partial | ✓ |
| Aggregation threshold ≥5 enforced architecturally | ? | ? | ✓ | ✓ | ✓ | — | ✓ | ? | ✓ |
| Validated wellbeing instrument (Mayo / Maslach) | — | — | optional | optional | — | — | ✓ (core) | — | optional v2 |
| Israeli Privacy Law Amendment 13 ready | — | — | — | — | — | — | — | — | ✓ (target) |
| Hebrew/Arabic UI | ? | ✓ (10+ langs) | partial | ✓ | ✓ | ? | partial | — | TBD per Q15-bis |
| Designed for shift-based clinical staff | — | — | — | — | — | — | partial | ✓ (manager-side) | ✓ |
| Open-loop "what we did" feedback to staff | — | partial | partial | partial | partial | — | — | partial | ✓ |
| Free / non-profit licensing path | — | — | — | — | — | — | — | — | N/A (in-house build) |

The interesting empty column is "Designed for shift-based clinical staff" + "<15-second check-in" + "Open-loop feedback" — the **three columns that none of the generic players touch and only Laudio touches in part, from a different angle**.

---

## 7. Anonymity model comparison

Anonymity is the #1 trust gate. How competitors handle it:

| Vendor | Model | Architectural strength |
|---|---|---|
| TINYpulse | "Anonymous unless you opt in." Two-way anonymous reply. | Strong (their core value prop). Re-identification risk in small segments mitigated by aggregation thresholds. |
| WorkTango | Anonymous surveys + identified recognition. Mixed model. | Medium. Anonymity is policy-based, not architecturally separated. |
| Culture Amp | Aggregation thresholds (typically 5–10 minimum). Identifiable comments require explicit choice. | Strong policy; architecture details not public. |
| Viva Glint | Aggregation thresholds; managers see "team" not individuals. | Medium-strong. Joined to M365 identity, which is a concern. |
| Peakon | Aggregation thresholds; comment NLP can re-identify by writing style — known risk. | Medium. Acknowledged limitation. |
| 15Five | Identified by default. Not an anonymity-first product. | N/A. |
| Press Ganey | Aggregation thresholds; results published at department/unit level. | Strong for survey instruments; less applicable for our daily-pulse use case. |
| Laudio | Manager-side product; staff don't directly self-report. Anonymity is moot. | N/A. |

**The architectural commitment we are making — and which is the strongest single differentiator in this matrix — is:**

> Anonymous reports use a one-way hashed `anonToken` derived from `(userId + date + salt)`. The hash function is one-way; no key escrow exists; even with database access, identity cannot be reversed without brute-forcing the salt against every employee on every day. This is **stronger than policy-based anonymity** because it survives a curious or malicious manager, a court order asking for "the anonymous reporter," and a database breach.

This must be communicated to staff in plain Hebrew/Arabic/English (whichever per Q15-bis) and, ideally, audited by a third party at pilot launch. This is the moat.

---

## 8. Pricing & licensing model comparison

All figures are approximate, gathered from review sites, blog comparisons, and partner posts. **None should be treated as authoritative.** Most vendors are quote-only at scale.

| Vendor | Approx. range (USD/employee/month) | Minimum commitment | Notes |
|---|---|---|---|
| TINYpulse | ~$5–10 | 25 seats / 12-month | Quote at scale. |
| WorkTango | Quote-only | Mid-market and up | Bundles surveys + recognition + rewards. |
| Culture Amp | $4–11 across tiers; enterprise quote-only | Often 50+ seats | Multi-product pricing complex. |
| Viva Glint | Bundled into Microsoft Viva license (~$12/user/month for full Viva suite) | M365 commitment | The cheap option *if* you're already a Microsoft shop. |
| Peakon | Quote-only; enterprise focus | Workday customer or 100+ seats common | Tied to Workday ecosystem. |
| 15Five | $4–16 across tiers | 10 seats minimum | SMB-friendly. |
| Press Ganey | Quote-only; commonly 5–6 figure annual contracts | Hospital-system level | Bundled with broader Press Ganey services. |
| Laudio | Quote-only | Hospital-system level | Limited public pricing data. |
| **This product** | Internal-build, no licensing cost | N/A | Operational costs: Supabase Pro ~$25/month, Vercel free-to-pro, Twilio/360dialog usage-based, Resend free-to-low. **Total monthly run-rate target: <$200/month for ward of <100 staff.** |

**Strategic implication:** the in-house build is roughly 30–100× cheaper at this scale than any commercial alternative. Even if Press Ganey or Viva Glint is "available" through a hospital enterprise agreement, the total cost of using it for ward-level pulse (configuration consultancy, compliance overhead, change management) is unlikely to be lower than continued in-house operation. Cost is not the sales-killer; *fit* is the sales-killer for the commercial alternatives.

---

## 9. What competitors get right (lessons to steal)

Compiled from across the matrix, prioritised by adoption effect:

1. **TINYpulse's anonymous follow-up reply mechanism.** A manager can ask "tell me more?" without unmasking the responder. Worth replicating in v2 if Q17 (Team Update) feature is well-received.
2. **Culture Amp's benchmark database.** Multi-tenant, de-identified comparison across organisations is a powerful retention feature. Worth keeping the data model open to it (Q19).
3. **WorkTango's "AI-suggested action plans."** Manager guidance on "what to do about this trend" is real value. Defer the AI part for Amendment 13 reasons, but the *manager-action-suggestion* UX is steal-worthy as a non-AI feature initially (e.g., "team energy <50% for 7 days → suggest publishing a Team Update").
4. **Press Ganey's outcome-correlation framing.** Long-term, connecting wellbeing data to patient-safety or retention outcomes (with proper consent and aggregation) is the strategic story.
5. **Laudio's operational-predictor approach.** Real shift data + self-reported pulse is more predictive than either alone. Future integration possibility (Q4-dependent).
6. **Viva Glint's "embedded in daily tools" philosophy.** Our equivalent: PWA install + one-tap entry from home screen.
7. **Workday Peakon's drill-down UX (theme → topic → comment).** Solid pattern for the manager dashboard, with the strict caveat: only on identified data, only for managers who have RBAC clearance, never on anonymous reports.

---

## 10. What competitors get wrong (gaps to exploit)

Compiled from observed weaknesses:

1. **Office-rhythm assumption.** Every generic player assumes Monday-9am, weekly cadence, desktop-first. Hospital wards run 24/7. *We design from the shift up.*
2. **Anonymity-as-policy, not architecture.** Most competitors say "we keep it anonymous"; few build the cryptographic guarantee. We do.
3. **Recognition theatre.** Public "Cheers for Peers"-style feeds are wrong for clinical settings. We do not have a recognition feed in MVP.
4. **Survey-program metaphor.** Most platforms treat wellbeing as a periodic measurement project. We treat it as continuous operational sensing.
5. **No closed loop.** Most platforms are extractive — they collect and report. Few mechanically require managers to publish "what we did about it." Without it, participation decays — Doc 01 cites 60%+ drop within 3 months. We make Team Update a first-class feature.
6. **One-size-fits-all dashboards.** Generic players show the same dashboard to a tech CEO and a head nurse. We design for the head nurse specifically — a clinician under load, glance-and-act, not analytics-deep-dive.
7. **No validated psychological-safety ceremony.** Nobody has the equivalent of "the anonymity status indicator that's persistently visible while you're filling out the check-in." We do (Spec v2 §11).
8. **Israeli regulatory fit.** No global player has localised for Amendment 13 specifically. They will get there, but we lead.
9. **Mobile-second.** Even players that say "mobile" mean responsive web. Few are PWA-installable with offline queue. We are.

---

## 11. Strategic implications for the product

Translated into product-design directives:

| Implication | Product directive |
|---|---|
| The wedge is shift-fit + anonymity-architecture + closed-loop. | Don't dilute these three in v1. Cut anything that doesn't reinforce one of them. |
| Press Ganey is a complement, not a substitute. | Position language: "Daily pulse beneath your annual engagement survey." Don't claim to replace validated instruments. |
| Laudio is the closest analogue from the manager side. | Watch their roadmap; if they expand into direct-staff-voice, the overlap grows. Build moats: anonymity architecture, Israeli localisation, regulatory fit. |
| The Israeli niche is open but small. | Plan for multi-tenant from the data model up (Q19). The path to scale is multi-ward → multi-hospital, not multi-product. |
| Procurement inertia is the real enemy. | Sales argument has to be: "Your Press Ganey / Viva license does not solve this specific problem (ward-level real-time anonymous pulse with shift-fit and Amendment 13 fit)." Crisp differentiation, not feature parity. |
| Trust is the adoption bottleneck. | The architectural anonymity guarantee + the HR-data-firewall policy (Q1) are jointly the trust foundation. Without both, the product will not adopt. |
| Costs are competitive at our scale. | Internal build runs <$200/month operational cost at pilot scale. Funding pressure from competing licensing costs is low. |

---

## 12. Open questions raised by this analysis

(Added to `docs/07_project/01_Open_Questions_Log.md` Round 1.)

- Q19: Multi-tenant readiness in v1 data model
- Q20: Pilot success criteria (go/no-go)
- Q21: Adverse-event protocol for severe-distress signals
- Q22: Audit log access policy
- Q23: Pen-test scheduling per Amendment 13
- Q24: Right-to-erasure technical scope
- Q25: Manager turnover handling

Plus existing Phase-0 questions, particularly Q1 (HR data-use firewall) and Q10 (anonymity guarantee scope), which are the trust foundation regardless of competitive landscape.

---

## 13. Sources & citations

Pulled together for traceability. Per Rule #1: anything not cited here is inference, not verified fact.

- TINYpulse / WorkTango product pages and 2026 review-site comparisons (SelectHub, SaaSworthy, GetApp, Capterra, Krowdbase, Matter, TrustRadius)
- Culture Amp, 15Five, Lattice, Workleap (Officevibe), Microsoft Viva Glint, Workday Peakon — vendor websites and review aggregator data, April 2026
- Press Ganey: 2024 Nurse Work Environment report, 2024 Nurse Resilience research, 2026 *State of Healthcare Safety* report (1.3M employees / 225 systems / 3,846 facilities), various company blog posts and partner announcements
- Laudio + AONL: "An Early Warning System for Nurse Burnout: Metrics and Strategies" (Oct 2025); American Hospital Association coverage Oct 2025
- Israeli HR-tech and wellness market: ensun.io, F6S, Calcalist (Eloops 2021 profile), CB Insights (Fijoya), MantraCare Israel guides
- Israeli Privacy Law Amendment 13: IAPP (Aug 2025 IAPP analysis by Or-Hof Law), Pandectes guide (Dec 2025), Recording Law (March 2026), Lexology Quarterly Privacy Update (Q4 2025), Chambers Data Protection & Privacy 2026 guide for Israel, Safetica explainer (Sep 2025), Lexology employment-relations analysis (Oct 2025), Ius Laboris (Nov 2025)
- `Document_01_Market_Research_Industry_Landscape_Wellbeing_App.docx` (April 2026) — internal source document
- `Wellbeing_Spec_v2_EN.docx` (March 2026) — internal source document
