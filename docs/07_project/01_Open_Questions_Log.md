# 01 — Open Questions Log

> **Living document.** Update whenever a question is asked, answered, or decided. Do not delete entries — mark them as Answered or Decided so the audit trail survives.
> Last updated: 2026-04-29 | Doc version: 0.1

---

## How to use this log

This document tracks every open question that affects product, technical, design, privacy, or organisational decisions. It exists because Spec v2 §19 enumerated 18 critical questions but did not assign owners, statuses, or due dates. Without those, questions go stale and assumptions leak into the codebase.

**Status legend:**
- 🔴 **Open** — no answer yet
- 🟡 **In Progress** — owner assigned, conversation underway
- 🟢 **Answered** — answer received, but no formal decision yet
- ✅ **Decided** — answer received and formally adopted; reflected in spec/code
- ⚠️ **Blocking** — development cannot proceed in the related area until this is closed

**Question ID convention:** `Q###` (sequential, never re-used). Q1–Q18 inherited from Spec v2 §19; Q19+ added during doc creation.

**Update protocol:**
1. New question → add at the bottom with next sequential ID
2. Answer received → update Status, Answered Date, Answer field; do not delete the question
3. Decision finalised → update Status to ✅ Decided, add Decision Date, link to where the decision lives in the spec/code
4. Recurring conflicts → escalate per the Escalation Path below

**Escalation path:**
- Product/UX questions → Ariel Falk (Spec v2 author) → Ward Manager
- Privacy/Legal questions → DPO (Q7) → Hospital Legal Counsel
- Technical/Hosting questions → Soroka IT → Hospital CIO
- Stakeholder conflicts → Machava Association leadership

---

## Phase 0 — Critical organisational & policy questions (BLOCKING)

These must be answered before Sprint 1. Spec v2 made this explicit and the recommendation stands.

### Q1 ⚠️🔴 HR data-use policy
**Question:** What is the hospital's policy on using employee wellbeing data for HR / pay / promotion / disciplinary decisions? Will there be a written, approved declaration that wellbeing data is *firewalled* from HR processes?
**Owner:** Hospital management / HR / Legal
**Asked:** Spec v2 (March 2026)
**Status:** Open
**Impact if unanswered:** Critical. Without a written firewall policy, staff will reasonably suspect surveillance and participation will collapse. This question alone can kill the project.
**Sub-questions:**
- Q1a: Will the policy be presented at onboarding, or is a separate communication sent?
- Q1b: Is there a written grievance path if a staff member believes wellbeing data was used inappropriately?
- Q1c: Does the policy survive personnel changes in management?
- Q1d: Is there language preventing aggregation-based decisions ("Ward 4B has low energy → restructure Ward 4B")?
**Notes:** This is the #1 trust gate. Even with anonymous mode, identified-mode adopters will not trust the system without this.

### Q2 ⚠️🔴 Hosting & cloud approval
**Question:** Does Soroka IT/InfoSec approve cloud hosting (Supabase, Firebase, Azure)? Or is on-premises infrastructure mandatory? Are there approved regions (Israel-only? EU-only?)?
**Owner:** Soroka IT
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Completely changes the stack choice (Spec v2 Option A/B/C). All technical architecture documents are blocked on this.
**Sub-questions:**
- Q2a: Is Supabase Cloud (US-hosted by default) acceptable, or must self-hosted Supabase be used?
- Q2b: Is Vercel acceptable for the frontend, or is hosting required inside the hospital network?
- Q2c: Are there pre-approved Israeli cloud providers (e.g., AWS Israel region, Azure Israel Central)?
- Q2d: Cross-border data transfer: is data of Israeli employees allowed to leave Israel under Amendment 13's adequacy framework?
**Notes:** Amendment 13 has specific cross-border transfer rules. The DPO must opine on this even if IT clears the technical hosting.

### Q3 ⚠️🔴 Manager role definition
**Question:** Who is the "ward manager" for system purposes? Attending physician? Head nurse? Both? Does the social worker have an officially-recognised role with system access?
**Owner:** Internal Medicine B management
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects role definitions, alert routing, RBAC matrix.
**Sub-questions:**
- Q3a: How many "managers" will there be at MVP launch?
- Q3b: Is there a hierarchy (junior manager → senior manager) for escalation?
- Q3c: Who handles alerts on the manager's day off? Is there a coverage protocol?
- Q3d: Does the social worker need their own account, or do they share with the manager?

### Q4 🟡 Shift-management system
**Question:** Is there a digital shift-management system (Shiftboard / similar) at Soroka? Can we receive an API or weekly CSV schedule for shift-aware reminders?
**Owner:** IT / Head nurse
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects shift-aware reminder model. Fallback is manual CSV upload by Admin per week (acceptable for MVP).
**Sub-questions:**
- Q4a: If no API, what frequency of CSV upload is realistic? Weekly? Bi-weekly?
- Q4b: Are shifts assigned per individual or per shift-group?
- Q4c: Are shift swaps frequent? Does the schedule change mid-week?
**Notes:** Spec v2 explicitly accepts manual CSV import as MVP-acceptable.

### Q5 ⚠️🔴 Authentication
**Question:** Is there an existing enterprise SSO (Azure Entra ID / Okta) at Soroka that can be connected? Is OTP via SMS approved as a fallback? Can we issue magic-link emails to corporate addresses?
**Owner:** IT
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects the entire authentication mechanism. Could mean reusing hospital identity (good) or building a parallel identity store (worse).
**Sub-questions:**
- Q5a: If SSO is available, is the staff identity directory accessible to scoped third-party services?
- Q5b: If OTP-only, what phone numbers are stored (personal vs work)?
- Q5c: Is there a corporate password policy that mandates rotation? (relevant for refresh-token strategy)

### Q6 🔴 Headcount and breakdown
**Question:** How many employees are in Internal Medicine B? Breakdown by role (doctors, nurses, paramedics, social workers, support staff)?
**Owner:** Head nurse
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects load testing, aggregation thresholds, notification cost model, and *whether the ≥5 aggregation rule is even feasible* (a ward of 25 with 6 roles will have segments below 5).
**Sub-questions:**
- Q6a: How does headcount distribute across morning/evening/night shifts on a typical day?
- Q6b: Are there rotational staff (residents, students) included or excluded from the pilot?
- Q6c: Expected pilot participation rate? (research suggests ≥70% adoption is realistic)
**Notes:** Without a real number, all sizing exercises in technical docs use "30–80 staff" placeholder.

---

## Phase 0 — Privacy & regulatory questions (BLOCKING)

### Q7 ⚠️🔴 DPO appointment
**Question:** Has the hospital appointed a DPO (Data Protection Officer)? Who is responsible for Amendment 13 compliance for this product?
**Owner:** Legal / HR
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Per Amendment 13 (effective 14 Aug 2025), hospitals processing "Information of Special Sensitivity" (ISS) at scale **must** appoint a DPO. The grace period for DPO appointments expired 31 Oct 2025, and DPO compliance is a 2026 enforcement priority of the Privacy Protection Authority. The DPIA cannot be approved without a DPO signing.
**Sub-questions:**
- Q7a: Is the hospital's DPO already in place organisation-wide, or product-specific?
- Q7b: Will the DPO review and approve the DPIA before pilot launch?
- Q7c: Who handles breach notification within the 72-hour window if there's a leak?
**Notes:** Verified facts (April 2026): the Israeli Privacy Protection Authority has begun enforcement under Amendment 13; first known fine was NIS 70,000 against HOT (telecoms). Administrative fines can reach NIS 320,000+ for cybersecurity violations and millions for governance violations.

### Q8 🔴 Data retention policy
**Question:** What is the data retention policy? How long to keep check-ins (24 months default per Spec v2 NFR-PRIV-04 — confirm)? What happens when an employee leaves the hospital? When pilot ends?
**Owner:** Legal / IT
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects retention automation, erasure mechanism, audit log scope. Amendment 13 requires data minimisation — keeping data "longer than needed" is a violation.
**Sub-questions:**
- Q8a: Does the retention clock reset when a check-in is updated, or is it from creation?
- Q8b: Is the audit log retention (7 years per Spec v2 §8) approved by Legal?
- Q8c: When a user is deleted, what about their check-ins (anonymised? deleted? retained for aggregate stats?)?

### Q9 🔴 Consent management
**Question:** Will employees sign a separate consent form? How is consent managed for employees who join mid-pilot? Can consent be withdrawn unilaterally, and what happens to past data when it is?
**Owner:** HR / Legal
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects onboarding flow and `consent_log` table design. Amendment 13 requires explicit, granular, documented consent — not buried in a generic employment contract.
**Sub-questions:**
- Q9a: Is there a consent version-history requirement (re-consent if privacy notice changes)?
- Q9b: Can a manager require participation, or is it strictly voluntary? (Spec v2 implies voluntary.)
- Q9c: What is the wording of the consent form — plain Hebrew? Plain English? Both?

### Q10 ⚠️🔴 Anonymity guarantee scope
**Question:** Does hospital management agree that anonymous reporting will *truly* be anonymous — even from the ward manager, even if the manager wants to drill down on a worrying trend?
**Owner:** Senior management + Legal
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** This is the credibility test for the entire anonymity model. If management reserves the right to "exceptional access," staff will discover this and the system fails.
**Sub-questions:**
- Q10a: Is "anonymous" the legal default, or only available on opt-in?
- Q10b: Are there court-order or law-enforcement scenarios that could compel re-identification? (Note: with the proposed `anonToken` design, technically no — but the policy needs to acknowledge this.)
- Q10c: Will the policy be public to staff or internal-only?

---

## Technical questions (Priority 2)

### Q11 🟡 WhatsApp Business API
**Question:** Is WhatsApp Business API approved for use? (Requires licensed BSP — 360dialog or Twilio — plus Meta-approved templates per use case.)
**Owner:** IT + Legal + Meta (template approval)
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects notification strategy. Fallback is SMS (acceptable but lower open rate).
**Sub-questions:**
- Q11a: Is there a budget for WhatsApp messaging (≈ $0.05/message)?
- Q11b: Is opt-in collection at onboarding acceptable, or must it be in-product?
- Q11c: Template approval is multi-day — can we start the process in parallel with development?
**Notes:** Per Doc 01, WhatsApp open rate in Israel is ~98%. This is a real adoption advantage if approved.

### Q12 🔴 Reference test devices
**Question:** What is the reference test device matrix? Do most ward staff use iPhone or Android? Which iOS / Android versions? Any institutional devices issued?
**Owner:** Ward staff (informal survey) / IT
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects PWA testing matrix, push notification compatibility (iOS 16 vs 17+), screen-size targets.
**Sub-questions:**
- Q12a: Is there a meaningful share of older Android (pre-Android 9) that lacks PWA support?
- Q12b: Are Soroka-issued devices (if any) locked-down in a way that affects PWA install?

### Q13 🔴 Brand guidelines
**Question:** Are there logo / brand guidelines for Machava Association to maintain in the design? Any Soroka co-branding requirements?
**Owner:** Machava Association
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects UI kit, colour palette, typography. Default is shadcn/ui + neutral palette; can be themed once brand guidance arrives.

### Q14 🔴 SLA expectation
**Question:** What SLA is required? Is downtime during night hours acceptable (night-shift staff also need to report)? What's the acceptable maintenance window?
**Owner:** IT / Management
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects hosting tier (Supabase Free vs Pro vs Team), on-call plan, deployment timing.
**Sub-questions:**
- Q14a: 99.5% uptime target from Spec v2 NFR-OPS-01 — is this acceptable to IT?
- Q14b: Is on-call required outside business hours? By whom? (student devs likely shouldn't be on-call.)

---

## UX & product questions (Priority 2)

### Q15 🔴 Battery metaphor validation
**Question:** Is "battery 0–100%" the right metaphor? Should we test alternatives with staff (temperature gauge, mood slider, simple 1–5 scale)?
**Owner:** Ward staff (user test)
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects the core UI component. The 15-second target depends on metaphor friction.
**Sub-questions:**
- Q15a: Should the metaphor be culture-tested? (Hebrew speakers, healthcare context, age range)
- Q15b: Does battery have any unintended associations in clinical context (e.g., medical battery, defibrillator)?
- Q15c: For staff with colour-vision deficiency, how is the gradient communicated?

### Q15-bis 🔴 UI language
**Question (NEW, added Round 1):** What language is the UI in for end users? Hebrew only? Hebrew + English toggle? Arabic too (Soroka serves Arabic-speaking communities and may have Arabic-speaking staff)?
**Owner:** Product (Ariel) + Ward Manager
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** Affects i18n architecture from day 1. Adding a second language later is much harder than designing for it from the start. Note: Spec v2 NFR-USAB-01 mentions "full LTR support" which is suspicious — Hebrew is RTL. This may be an inherited typo from a translation pass and should be re-confirmed.
**Notes:** Even if the answer is "Hebrew only," the design system + microcopy library should be structured for i18n (no hard-coded strings).

### Q16 🔴 Reminder cadence
**Question:** Is a daily reminder preferred, or is weekly sufficient? What is the staff preference?
**Owner:** Ward staff
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects reminder frequency and survey-fatigue risk. Weekly is the default in Spec v2 §13; Doc 01 cautions about fatigue.

### Q17 🟡 Team Update concerns
**Question:** Does the ward manager want a visible "Team Update" feature for all staff? Are there concerns about political messaging or HR-style communications creeping in?
**Owner:** Ward manager
**Asked:** Spec v2
**Status:** Open
**Impact if unanswered:** Affects the closed-loop feature, which research says is critical to participation. If managers won't use it, an alternative loop (e.g., aggregate visibility) is needed.

### Q18 ✅ Anonymity threshold
**Question:** What is the anonymity threshold per segment? Spec v2 proposed: <5 reporters = "insufficient data." Acceptable?
**Owner:** Manager + IT
**Asked:** Spec v2
**Status:** Decided (provisionally — to be confirmed with DPO)
**Decision:** ≥5 reporters required for any segment-level display. Below that, only aggregate ward-level data is shown. Codified in Spec v2 §6 FR-05.
**Decision date:** 2026-03 (in Spec v2)
**Caveat:** DPO sign-off pending under Q7. Threshold may be raised to ≥10 if Legal requests more conservative anonymisation.

---

## New questions added during Round 1 doc creation

### Q19 🔴 Multi-tenant readiness
**Question:** Is multi-tenant (multi-ward, multi-hospital) on the v2 roadmap, or is "single instance per ward" the long-term model?
**Owner:** Machava Association leadership
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** Architecture-defining. Adding `tenant_id` columns and tenant-scoped RLS policies is much cheaper now than after the first 1,000 check-ins.
**Notes:** Spec v2 §4.2 says "Multi-Ward / Enterprise" is v2. But the data model design choice has to be made *now* — leave room or commit.

### Q20 🔴 Pilot success criteria
**Question:** What are the explicit go/no-go criteria for moving from closed pilot to full ward launch (Spec v2 Phase 5 → Phase 6)? What metrics constitute success?
**Owner:** Ariel + Hospital Mgmt
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** Without explicit criteria, "pilot success" becomes a political question. Spec v2 §16 has KPI targets but doesn't say which are hard gates.

### Q21 🔴 Adverse event protocol
**Question:** What happens if a staff member reports very low energy (e.g., a string of sub-10% reports) AND there's reason to suspect crisis (suicidal ideation, severe distress)? What is the duty-of-care protocol?
**Owner:** Social Worker + Legal + Hospital Mgmt
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** This is a clinical and legal exposure. The product cannot diagnose, but the alert routing implies an obligation. A documented protocol is needed.
**Sub-questions:**
- Q21a: Is the social worker on-call for low-energy alerts?
- Q21b: Is there an explicit copy/UI moment where the staff member is reminded that the system is not a crisis line, and given resources?
- Q21c: For anonymous reports, can a "concerned check-in" trigger an outreach (without re-identification)?

### Q22 🔴 Audit log access
**Question:** Who has access to the audit log? Spec v2 says "Admin" + "IT Security." Is this the same person? Different people? Is there a "read-only auditor" role?
**Owner:** IT + Legal
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** Affects RBAC matrix and audit-of-the-audit-log design.

### Q23 🔴 Pen-test scheduling
**Question:** Per Amendment 13, "large sensitive databases" require penetration testing every 18 months. Is the pilot ward's database "large" under the regulation, and what's the pen-test schedule?
**Owner:** DPO + IT Security
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** Pen-test is required pre-launch per Spec v2 §17 risk mitigation. Need a vendor selected and a schedule before Phase 5.
**Notes:** Verified: Amendment 13 (and the underlying Data Security Regulations) require pen-testing every 18 months for sensitive databases. The threshold of "large" is currently set at 100,000 individuals for some triggers, but lower thresholds apply for ISS data. DPO must opine.

### Q24 🔴 Right-to-erasure technical scope
**Question:** When a staff member requests erasure under Amendment 13, what exactly is deleted? PII fields anonymised? Check-ins removed? Aggregate statistics adjusted retroactively? Audit log entries about that user?
**Owner:** DPO + IT
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** Affects the erasure workflow design. The 30-day SLA in Spec v2 NFR-PRIV-01 needs a concrete operational definition.

### Q25 🔴 Manager turnover handling
**Question:** When a manager changes (transfer, leaves), what happens to their open alerts, in-progress acknowledgments, and Team Updates? Is there a transfer-of-ownership flow?
**Owner:** Ariel + IT
**Asked:** Round 1 (2026-04-29)
**Status:** Open
**Impact if unanswered:** Affects RBAC + state-machine design for alerts.

---

## Decision log

(Decisions made in this project, with date and source. Add to this log as questions get closed.)

| Date | Decision | Source | Question(s) closed |
|---|---|---|---|
| 2026-03 | Anonymity aggregation threshold = 5 reporters minimum | Spec v2 §6 FR-05 | Q18 (provisional, pending DPO) |
| 2026-03 | English-only for code, docs, internal communications | Spec v2 + standing user instructions | — |
| 2026-03 | PWA-first; native app deferred to v2 | Spec v2 §10 | — |
| 2026-03 | Battery (0–100%) is the primary check-in metaphor for MVP | Spec v2 §11 | Provisional pending Q15 |
| 2026-03 | WhatsApp Business in MVP (was v2 in original spec) | Spec v2 §1.1 | Provisional pending Q11 |
| 2026-04 | Tech stack target = Option C (Supabase + Vercel), with Option B (NestJS + Azure) as fallback | Spec v2 §10.1 | Provisional pending Q2 |
