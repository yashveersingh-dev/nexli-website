# Gamified Dashboard — Phase 1 (minimal real version)

> Audience: student portal + parent (read-only) + a staff "award points" surface.
> Goal of Phase 1: a real, computed-from-existing-data dashboard showing **XP,
> level, three streaks, earned badges, house rank, and recognitions** — plus a
> teacher tool to award bonus/character points. No mock data; everything derives
> from attendance / homework / library / events / houses that NEXLI already stores.

## Buildable now vs blocked
| Capability | Status | Note |
|---|---|---|
| Point/XP rules engine (compute from attendance, homework, library, events) | ✅ Buildable now (offline) | Pure client-side TypeScript over collections already subscribed. |
| Streak computation (attendance / homework / reading) with holiday-aware freeze | ✅ Buildable now | Uses existing attendance + academic calendar/holiday data. |
| Badge definitions + auto-awarding from thresholds | ✅ Buildable now | Deterministic rules; writes `student_badges`. |
| Teacher-awarded points / character (NEP) badges | ✅ Buildable now | New `point_awards` collection + roster screen. |
| House / section leaderboard | ✅ Buildable now | Reuses `houses.points`; section board computed client-side. |
| Recognition surfacing (Prefect/Captain/Star) | ✅ Buildable now | New `recognitions` collection + existing `students.tags`. |
| Nightly recompute / push nudges ("1 day to streak!") | ⛔ Blocked (needs Cloud Functions / paid Blaze) | Phase 1 recomputes on dashboard load instead; nudges deferred to later phase. |
| AI-generated "coach" encouragement text | ⛔ Blocked (AI key) | Not in scope for any phase here; templated copy only. |

**Spark-tier rule:** no scheduled functions in Phase 1. All scoring is recomputed
client-side when the dashboard mounts, cached to a per-student `gamification_state`
doc only as an optimisation (write-on-change), never as the source of truth.

## Data model (under `schools/{schoolId}/…`)

### New collections
1. `gamification_config` (single doc, id `default`) — school-tunable rules.
   ```
   {
     enabled: boolean,
     pointRules: {
       attendancePresent: 5, attendancePunctual: 2,
       homeworkOnTime: 10, homeworkLate: 3,
       libraryIssue: 4, libraryReturnOnTime: 2,
       eventRegistered: 5, eventAttended: 10
     },
     levelCurve: number[],            // cumulative XP thresholds per level
     levelNames: string[],            // e.g. ["Scholar I", "Scholar II", …]
     leaderboards: { house: true, section: false, individualPublic: false },
     seasonId: string,                // current term/season key
     updatedAt, updatedBy
   }
   ```
2. `badge_defs` (collection) — catalogue of badges (seeded defaults, school-editable).
   ```
   { id, title, description, icon, tier?: 'bronze'|'silver'|'gold'|'platinum',
     category: 'attendance'|'homework'|'reading'|'participation'|'character'|'milestone',
     criteria: { type, threshold, window? },   // machine rule for auto-award
     nepCompetency?: string,                    // e.g. "collaboration"
     manualOnly?: boolean,                      // character badges awarded by staff
     active: boolean, order }
   ```
3. `student_badges` (collection) — awarded badge instances.
   ```
   { id, studentId, badgeDefId, title, icon, category, tier?,
     awardedAt, source: 'auto'|'staff', awardedBy?, reason?, evidence?,
     seasonId }
   ```
4. `point_awards` (collection) — staff/teacher manual point grants (audit trail).
   ```
   { id, studentId, points, currency: 'character'|'bonus',
     reason, nepCompetency?, awardedBy, awardedByName, awardedAt, seasonId }
   ```
5. `recognitions` (collection) — Prefect/Captain/Star honours (time-bound, auditable).
   ```
   { id, studentId, studentName, type: 'prefect'|'house_captain'|'sports_captain'
       |'monitor'|'club_lead'|'star_of_week'|'student_of_month'|'other',
     title, scope?: 'school'|'house'|'section', termId?, seasonId,
     startDate, endDate?, awardedBy, awardedByName, createdAt, active }
   ```
6. `gamification_state` (collection, doc id = studentId) — **cache only**, recomputed.
   ```
   { studentId, totalXp, level, levelName,
     points: { discipline, diligence, reading, participation, character },
     streaks: { attendance: n, homework: n, reading: n },
     computedAt, seasonId }
   ```

### Reused existing data (read-only)
- `attendance` — present/absent/late per day → discipline points + attendance streak.
- `homework` + `homework_submissions` — on-time vs late → diligence points + streak.
- library issue records — reading points + reading streak.
- `events` + `event_registrations` — participation points.
- `houses` (`points`, `name`, `color`) — house leaderboard.
- `students` (`name`, `house`, `sectionId`, `tags`) — context + legacy recognitions.
- academic calendar / holidays (existing academics data) — streak freeze days.

## Scoring engine (new module: `features/gamification/engine.ts`)
Pure functions, fully unit-testable, no Firestore writes:
- `computePoints(rules, attendance, submissions, libraryIssues, registrations)` → per-currency totals.
- `computeStreak(events, { freezeDays })` → current + longest streak (skips holidays/weekends/approved leave).
- `computeLevel(totalXp, levelCurve, levelNames)` → `{ level, levelName, xpInLevel, xpToNext }`.
- `evaluateBadges(badgeDefs, computedStats, alreadyEarnedIds)` → list of newly-earned badge defs.

Auto-award flow on dashboard mount: compute → diff against `student_badges` →
`addDoc` any newly earned badges (idempotent: `badgeDefId + seasonId` uniqueness
checked client-side before write) → write `gamification_state` cache.

## Screens & components

### Student portal — new "Rewards" / enhanced "Achievements" page
Path: extend `features/studentportal` (the existing `StudentAchievementsPage`
already shows house + participation + recognitions — we layer the game on top).
New file `features/gamification/StudentRewardsPage.tsx` (or fold into Achievements):
- **HeroStrip**: Level badge + name, XP progress bar to next level, total points.
- **StreakRow**: three streak cards (attendance / homework / reading) with flame
  icon + current count + "longest" sub.
- **BadgeWall**: grid of earned `student_badges` (tier-coloured), tap → `BadgeDetailSheet`
  (criteria, date, awarder, evidence); greyed "locked" badges show what to do next.
- **PointsBreakdown**: the five currencies with a "how points are earned" expander
  reading from `gamification_config.pointRules` (explainability).
- **HouseStanding**: reuse existing house card + rank (already built).
- **RecognitionShelf**: active `recognitions` (Prefect/Captain/Star) as honour cards.

### Leaderboard
`features/gamification/LeaderboardPage.tsx` (student + staff):
- **House board** (always on if `leaderboards.house`): houses sorted by `points`.
- **Section board** (if enabled): students in my section by total XP — shows "You"
  highlighted; respects `individualPublic` toggle (private "your rank: 4/32" if off).
- **Movers**: top "most improved this week" (delta from cached state).

### Staff — Award Points / Recognition
`features/gamification/AwardPointsPage.tsx`:
- Class/section roster (reuse student roster pattern) → select student(s) →
  pick currency (character/bonus) + points + reason + optional NEP competency →
  writes `point_awards`. ClassDojo-style fast multi-select.
- Award a manual badge (`manualOnly` defs) → writes `student_badges`.
- Manage recognitions: create/end a `recognition` (Prefect/Captain/Star).

### Parent portal (read-only)
Add a read-only mirror of the child's HeroStrip + StreakRow + BadgeWall in the
parent "My Children" surface (reuses the same components, no award controls).

### Staff/leadership dashboard widget
Small "Top movers this week" + "Recognitions this term" panel on `StaffDashboard`.

## Role gating
- New module key `gamification` (add to `lib/roles/modules.ts` + catalogue).
- **Students/parents**: `view` only (own data; parent scoped to own children).
- **Teachers / class teachers**: `gamification.create` (award points, manual badges).
- **Academic coordinator / HOD / VP-Academic / principal**: `manage` (recognitions,
  config, leaderboard toggles, badge catalogue editing).
- Register routes in `app/registerModules.ts`:
  - `registerModule('student', 'rewards', …)`
  - `registerModule('parent', 'rewards', …)` (read-only variant)
  - `registerModule('staff', 'gamification', …)` (award + manage + leaderboard)
- Mirror gating in `firestore.rules`: students/parents read own `student_badges`,
  `point_awards`, `recognitions`, `gamification_state`; staff with role write.

## Reuse of existing components
`Panel`, `KPICard`, `Badge`, `Icon`, `Avatar`, `Tabs`, `Sheet`, `Modal`,
`EmptyState`, `Skeleton`, `DataTable`, `useSession`, `useStudentContext`,
`useHouses`, `useEvents`, `useEventRegistrations`, `tenantCol`/`useCollection`,
`formatDate`. Follow the `features/counseling/data.ts` data-layer pattern
(`stripUndefined`, `serverTimestamp`, typed `useCollection` hooks).

## Phase 1 acceptance
- A student sees real XP/level, three live streaks, and at least the auto-awarded
  badges computed from their actual attendance/homework/library/event records.
- A teacher can award character points + a manual badge from a roster in ≤3 taps.
- House leaderboard renders from real `houses.points`.
- Recognitions (Prefect/Captain/Star) created by staff appear on the student's and
  parent's dashboards, dated and auditable.
- Nothing is faked; the "how points work" expander matches the live config.
