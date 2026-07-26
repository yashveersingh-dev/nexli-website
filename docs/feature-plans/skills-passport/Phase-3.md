# Skills Passport / E-Portfolio — Phase 3 (lifecycle, APAAR-readiness, analytics)

> The standalone-grade depth: year-on-year continuity, graduation handoff to alumni,
> national-locker (APAAR/ABC/DigiLocker) readiness, and school-wide talent analytics.

## New capabilities

### 1. Lifecycle & continuity
- Passport accumulates across academic years with **grade/class context per entry**;
  promotion (existing academics flow) carries the passport forward unchanged.
- **Year snapshots**: at year-end, archive a `portfolio_snapshots/{studentId}/{year}`
  immutable summary (verified entries, skills profile, credentials) — a permanent record.

### 2. Graduation → Alumni handoff
- On graduation, export the verified passport into the **alumni** module profile
  (reuses `features/alumni`), so the achievement record follows the student out and
  can be referenced for references/recommendations.
- Generate a **final school transcript-of-achievements** PDF (the non-academic
  companion to the report card / HPC).

### 3. APAAR / ABC / DigiLocker readiness (⛔ blocked on gov approval — model ready now)
- Keep the JSON export **APAAR/ABC-shaped** (credential IDs, issuer code, skill codes
  mappable to national taxonomies) so when DigiLocker/ABC integration is approved, a
  thin adapter pushes verified credentials to the national Academic Bank of Credits.
- Build the **offline mapping + export adapter** now (no live connection); show a
  clear "Pending national integration approval" state — never fake a DigiLocker push.

### 4. School-wide talent analytics
- Coordinator/leadership dashboards:
  - Passport coverage & richness by class/house/grade.
  - **Talent search**: query verified achievements ("national-level athletes",
    "students with coding credentials", "Grade-8 debaters") for scholarships,
    teams, recommendations.
  - Skills-gap heatmap across cohorts → informs co-curricular planning (NEP holistic).
- All computed client-side from existing collections; export to CSV/PDF (existing pattern).

### 5. Scholarship / college-application bundle
- One-click **application pack**: featured passport + verified credentials + skills
  profile + (cross-module) report card/HPC → a single shareable PDF the student
  uses for college/scholarship forms.
- Links into the Career Counselling module's college/scholarship matches.

## Data model additions
- `portfolio_snapshots` subcollection per student/year.
- `talent_index` (optional denormalised, computed) for fast talent search; otherwise
  computed live.
- Extend export schema with national-taxonomy mapping fields (issuerCode, skillCodes).

## Screens
- `TalentSearchPage` (leadership).
- `ApplicationPackBuilder` (student/counsellor) — bundles passport + HPC + credentials.
- `NationalSyncPage` (offline shell, "approval pending").

## Role gating
- Talent search + analytics: coordinator/HOD/VP-Academic/principal/leadership.
- Application pack: student/parent (own) + counsellor.
- National sync shell: principal/registrar (read-only until approved).

## Cross-module reuse
- Alumni (graduation handoff), HPC/report-card (application pack), Career Counselling
  (scholarship/college matches), Gamification (credentials/competency feed),
  Certificate Generator (transcript-of-achievements).

## Acceptance
- A graduating student's verified passport materialises into their alumni profile and
  a transcript-of-achievements PDF.
- Talent search returns correct students by verified achievement criteria.
- The APAAR/ABC export validates against the national-shaped schema offline; the live
  sync is clearly shelled as approval-pending, never faked.
