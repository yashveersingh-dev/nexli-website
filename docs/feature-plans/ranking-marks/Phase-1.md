# Marks-Based Ranking — Phase 1 (BUILT ✅)

**Buildable now vs blocked:** Fully buildable offline — reads existing `exam_results`. No paid/gov dependency. (Demo shows an honest empty state because no exam results are seeded yet.)

## Principle
Pure-merit leaderboard ranked on **normalised exam percentage**, never absolute marks and never mixed with attendance — so a Class 6 student at 100% outranks a Class 7 student at 99%.

## Built in Phase 1 (`Web/src/features/rankings/`)
- `RankingsHub` with a **By marks** tab (separate `AttendanceRanking` engine in the same hub, see `../ranking-attendance/`).
- Score = average of each student's `ExamResult.percentage` across the chosen scope.
- **Exam selector:** Cumulative (all exams) or a specific exam (exam-wise vs full-year).
- **Scopes:** whole school / by class (grade) / by section.
- **Full ranked list with pagination** (25/page, "Showing X–Y of Z", Prev/Next), not just toppers.
- **Tie-break:** higher percentage → higher total marks → name (deterministic order).
- Medals for top 3; row links to the student profile.
- Staff-only (nav gated by `exams.read`); not exposed to parents/students (privacy).
- Honest empty state when no results exist yet.

## Phase 2 (next)
- Subject-wise rankings; rank movement (▲/▼ vs previous exam); percentile column.
- Export merit list to PDF/CSV.
- Per-school **privacy toggle** (publish to parents/students vs internal-only) — some boards discourage publishing child rank lists.
- Configurable tie-break priority subject.

## Phase 3
- Cohort/term trend; "most improved" board; weighting config (CA + exam).
