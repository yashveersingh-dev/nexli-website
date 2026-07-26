# Gamified Dashboard — Phase 2 (depth: badges, seasons, wellbeing)

> Builds on Phase 1's live scoring. Adds the rich badge catalogue, tiered/seasonal
> progression, configurable wellbeing guardrails, and the parent-facing polish that
> makes it feel like a finished standalone product.

## New / extended capabilities

### 1. Full tiered badge system
- Seed a comprehensive `badge_defs` catalogue (school-editable):
  - Attendance: Perfect Week → Month → Term (bronze/silver/gold), "Comeback Kid".
  - Homework: First Submission, 10/50/100 on-time (tiers), "No Late This Month".
  - Reading: First Book, 5/10/25 books, reading-streak tiers.
  - Participation: First Event, 5 Events, "All-Rounder" (sport+cultural+academic).
  - Milestone: 30/100/365-day attendance streak.
- **Badge progress** on locked badges ("7 / 10 books" bar) computed by the engine.
- **Badge catalogue manager** screen for coordinators (create/edit/disable defs,
  set criteria, icon, tier, NEP competency).

### 2. Seasons / terms
- `gamification_config.seasonId` rotates per term. New `seasons` collection:
  `{ id, name, startDate, endDate, active }`.
- Points/streaks are season-scoped for leaderboards but **lifetime totals** persist
  (lifetime XP + "this season XP" both shown). Season rollover archives a
  `season_summary/{studentId}/{seasonId}` snapshot (top badges, final rank).
- "Season recap" card on the dashboard at term end (templated, no AI).

### 3. NEP life-skill competency badges (deeper)
- Map character badges to the six NEP competencies (Collaboration, Critical
  Thinking, Communication, Creativity, Citizenship, Curiosity).
- Aggregate a **competency radar** on the student profile (how many awards per
  competency) — feeds the HPC / Skills Passport (cross-module reuse).

### 4. Wellbeing guardrails (configurable)
- Per-board admin toggles already in config; add **grade-band defaults** (primary =
  team boards only, no individual ranking; secondary = opt-in individual).
- "Most improved" framing surfaced more prominently than absolute toppers.
- **Per-student opt-out** of public leaderboards (parent/student request → flag on
  `gamification_state`); still earns badges privately.

### 5. Parent engagement
- Parent push/inbox message (reuses existing `communication`/`messaging`) when a
  child earns a Gold+ badge or a recognition — **opt-in**, templated.
- Parent "celebrate" reaction logged (lightweight `badge_reactions`).

### 6. Staff insights
- Coordinator dashboard: engagement distribution, badges awarded per teacher,
  recognition coverage by house/section, streak-at-risk list (students whose streak
  breaks tomorrow if absent) — all computed client-side from existing data.

## Data model additions
- `seasons` collection (above).
- `season_summary` subcollection per student.
- `badge_reactions` `{ id, badgeId, byUid, reaction, at }`.
- Extend `gamification_state` with `lifetimeXp`, `competencyCounts`, `optOutPublic`.

## Screens
- `BadgeCatalogPage` (coordinator manage).
- `CompetencyRadar` component (reused in profile + HPC + skills passport).
- `SeasonRecapCard`, `StreakAtRiskPanel`.
- Parent celebrate UI in the children surface.

## Role gating
- Catalogue manage stays at coordinator/HOD/VP-Academic/principal.
- Parent notifications gated by existing communication consent flags.

## Acceptance
- Tiered badges auto-award with visible progress on locked ones.
- Term rollover archives a recap; lifetime vs season XP both display.
- Wellbeing toggles demonstrably change what students see by grade band.
- Competency radar populated from real character awards and reused by HPC.
