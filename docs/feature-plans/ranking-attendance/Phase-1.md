# Attendance-Based Ranking — Phase 1 (BUILT ✅)

**Buildable now vs blocked:** Fully buildable offline — reads existing `attendance_days`. No paid/gov dependency. (Demo shows an honest empty state because no attendance is seeded yet.)

## Principle
Leaderboard ranked purely on **attendance percentage** (present ÷ recorded working days). Mirrors the marks engine's architecture but is kept **completely separate** so the two never contaminate each other.

## Built in Phase 1 (`Web/src/features/rankings/`)
- **By attendance** tab in `RankingsHub`.
- % = present-day rate per student (`present`/`late` = 1, `half_day` = 0.5, `holiday`/unmarked skipped) over recorded days.
- **Scopes:** whole school / by class (grade) / by section (same `useScope` as marks).
- **Full ranked list with pagination** (25/page) + tie-break (higher % → more recorded days → name).
- Medals for top 3; row links to the student profile.
- Staff-only; honest empty state when no attendance recorded.

## Phase 2 (next)
- Tie-break on fewer lates / longest present-streak (needs late + streak aggregation).
- Configurable handling of medical/approved leave so genuine absences aren't penalised.
- Rank movement vs previous month/term; export to PDF/CSV.
- Per-school privacy toggle (as with marks).

## Phase 3
- Class/section attendance leaderboards (aggregate, not per-student) for healthy competition without singling out children.
