# Skills Passport / E-Portfolio — Phase 1 (minimal real version)

> Goal of Phase 1: a real, mostly **auto-filled** achievement passport. A student/
> parent sees their achievements aggregated from events + recognitions + gamification
> badges, can **add a self-reported achievement** with a description, and staff can
> **verify** it so it becomes a trusted school-signed credential. No mock data.

## Buildable now vs blocked
| Capability | Status | Note |
|---|---|---|
| Achievement record (typed entries, skills tags, dates, level) | ✅ Buildable now (offline) | New `portfolio_entries` collection. |
| Auto-aggregate events, recognitions, badges into the passport | ✅ Buildable now | Reads existing collections client-side. |
| Verification workflow (claim → staff verify → signed credential) | ✅ Buildable now | Verifier uid + timestamp stored; no external service. |
| Skills/competency tagging + simple skills profile | ✅ Buildable now | Deterministic tag aggregation. |
| PDF passport export + JSON (Open-Badges/APAAR-shaped) export | ✅ Buildable now | Client-side (reuse existing PDF/print + JSON download patterns). |
| Evidence file uploads (photos/PDFs) | 🟡 Partial | Firebase Storage on Spark is limited; Phase 1 supports **links/URLs as evidence** + small inline images via existing attachment pattern. Full file storage when Storage/Blaze available. |
| Public token-gated share link | ⛔ Blocked in P1 (needs a read rule for anonymous token) | Shipped in Phase 2 with a signed share token; P1 export is PDF/JSON only. |
| AI auto-summary of the portfolio / "skills narrative" | ⛔ Blocked (AI key) | Templated summary only; AI narrative is out of scope here. |

## Data model (under `schools/{schoolId}/…`)

### New collections
1. `portfolio_entries` (collection)
   ```
   {
     id, studentId, studentName, classGrade?, sectionId?,
     type: 'project'|'cocurricular'|'sport'|'art'|'volunteering'|'leadership'
         |'competition'|'internship'|'certificate'|'award'|'other',
     title, description,
     startDate, endDate?, durationLabel?,
     level: 'school'|'inter_school'|'district'|'state'|'national'|'international',
     role?, organisation?,
     skills: string[],                 // from skills taxonomy (NEP C's + domain)
     nepCompetencies?: string[],
     evidence?: { kind: 'link'|'image'|'file', url, label }[],
     reflection?: string,              // student's own note
     source: 'student'|'parent'|'staff'|'auto:event'|'auto:badge'|'auto:recognition',
     sourceRef?: string,               // id of the originating event/badge/recognition
     featured?: boolean,               // student's showcase pick
     visibility: 'private'|'school'|'shareable',
     status: 'draft'|'submitted'|'verified'|'rejected',
     verification?: { verified: boolean, verifiedBy, verifierName, verifiedAt,
                      note?, evidenceHash? },
     createdAt, createdBy, updatedAt, seasonId?
   }
   ```
2. `skills_taxonomy` (single doc `default`, school-editable)
   ```
   { nepCompetencies: [...6 C's...],
     domainSkills: { 'STEM': [...], 'Arts': [...], 'Sports': [...],
                     'Leadership': [...], 'Languages': [...], ... },
     updatedAt, updatedBy }
   ```
3. `portfolio_settings` (single doc `default`)
   ```
   { enabled, allowStudentSelfAdd, allowParentAdd,
     requireVerificationToShow: boolean,   // if true, only verified entries appear public
     defaultVisibility, updatedAt }
   ```

### Reused existing data (read-only, for auto-fill)
- `events` + `event_registrations` (status `attended`) → auto `competition`/`cocurricular` entries.
- `recognitions` (from gamified module) → `leadership`/`award` entries.
- `student_badges` (gamification) → verified `certificate`/`award` micro-credentials.
- `students` (`name`, `house`, `sectionId`, `tags`).
- HPC competency data + `point_awards` → competency profile.
- `houses` → sports/house honours context.

**Auto-fill rule:** the engine reads these sources and renders *virtual* passport
items inline; when a student "saves to passport" or a staff verifies, it
materialises a real `portfolio_entries` doc (`source: 'auto:*'`, pre-verified if it
came from a verified school record like an attended event or an awarded badge).

## Aggregation engine (`features/skillspassport/aggregate.ts`)
Pure functions:
- `gatherAutoEntries(student, events, regs, badges, recognitions)` → virtual entries.
- `mergeWithManual(autoEntries, portfolioEntries)` → de-duplicated unified list.
- `computeSkillsProfile(entries, taxonomy)` → `{ skill: count, competency: count }`.
- `buildPassportExport(student, entries, profile)` → structured object for PDF + JSON.

## Screens & components

### Student portal — Passport page (replaces/extends Achievements)
`features/skillspassport/StudentPassportPage.tsx`:
- **PassportHeader**: student name, class/house, photo, headline stats
  (X achievements, Y verified, Z skills) — reuse `KPICard`.
- **Tabs** (`Tabs`): All / Verified / By type / Skills profile.
- **EntryList**: cards per achievement; verified entries show green "Verified by …"
  badge, self-reported show amber "Self-reported".
- **AddAchievementSheet** (`Sheet`): the one-form add (type, title, description,
  dates, level, role, org, skill tags suggested by type, evidence link/image,
  reflection) → writes `portfolio_entries` `status: 'submitted'`.
- **SkillsProfile**: radar/bar of competencies + domain skills (reuse charts).
- **Showcase toggle**: mark entries `featured`.

### Staff — Verification queue + recording
`features/skillspassport/VerificationQueuePage.tsx`:
- Queue of `status: 'submitted'` entries (filter by class/section).
- One-tap **Verify** (sets `verification`, `status: 'verified'`) or **Reject** with note.
- Staff can also **record an achievement on behalf of a student** (e.g. a sports
  coach logs a tournament result) → pre-verified.

### Export
- **PDF passport** (one-page summary + detailed pages) via existing print/PDF pattern.
- **JSON export** in an Open-Badges-flavoured, APAAR-shaped schema (so a later APAAR/
  ABC integration can map fields without redesign).

### Parent portal
Read-only mirror of the child's passport + ability to add a self-reported
achievement (if `allowParentAdd`), which enters the same verification queue.

### Staff/coordinator overview (light in P1)
A simple list: passport richness per student + "claims awaiting verification" count
on the staff dashboard.

## Role gating
- New module key `portfolio` (add to `lib/roles/modules.ts` + catalogue).
- **Students**: view + create own entries (own-record scope) + curate.
- **Parents**: view own children + optional add (own-children scope).
- **Class teacher / coach / coordinator**: `portfolio.verify` + record-on-behalf.
- **HOD / VP-Academic / principal**: `manage` (taxonomy, settings, all entries).
- Register routes:
  - `registerModule('student', 'passport', …)`
  - `registerModule('parent', 'passport', …)` (read-only + optional add)
  - `registerModule('staff', 'portfolio', …)` (verification queue + manage)
- `firestore.rules`: a student/parent reads/writes only own-student `portfolio_entries`
  and can never set `verification` (verification fields writable only by verifier
  roles). Mirrors the counseling/confidential pattern already in the rules.

## Reuse of existing components & patterns
`Panel`, `KPICard`, `Badge`, `Icon`, `Avatar`, `Tabs`, `Sheet`, `Modal`, `DataTable`,
`EmptyState`, `Skeleton`, charts, `useSession`, `useStudentContext`,
`useEvents`/`useEventRegistrations`, `useHouses`, `tenantCol`/`useCollection`,
`formatDate`. Data layer follows `features/counseling/data.ts` conventions.
Cross-module: consumes `recognitions` + `student_badges` from the gamified module
and competency data from HPC.

## Phase 1 acceptance
- A student opens the passport and it is **already populated** from their attended
  events, awarded badges and recognitions — not blank.
- A student adds a self-reported project with an evidence link; it shows as
  "Self-reported" until a teacher verifies it in the queue, then flips to "Verified
  by [name], [date]".
- Skills profile aggregates real tagged data.
- PDF + JSON export produce a complete, accurate passport with provenance labels.
- No faked verification; verification fields are only writable by verifier roles.
