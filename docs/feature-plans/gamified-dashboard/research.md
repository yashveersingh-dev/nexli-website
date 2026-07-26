# Gamified Student Dashboard — Research (world-best, standalone)

> Goal: build the engagement layer of NEXLI as if it were the world's #1 standalone
> student-gamification product (think ClassDojo + Classcraft + Duolingo streaks +
> house systems), but tailored to Indian K-12 and NEP 2020 (holistic, competency,
> life-skills) and powered ENTIRELY by data NEXLI already has (attendance, homework,
> reading/library, events, houses, recognitions). No new "learning content" — we
> reward the real school behaviours the ERP already records.

## Why gamify (the evidence)
- **Streaks** (Duolingo) are the single strongest retention lever: a visible
  "don't break the chain" counter drives daily return behaviour.
- **Points + badges + levels** (Classcraft XP/levels, ClassDojo points) turn
  invisible good habits (showing up, submitting work on time, reading) into a
  visible, collectible progression.
- **Leaderboards** add competition but must be *opt-in / team-based* for K-12 to
  avoid demotivating the bottom of the table — house/section leaderboards beat
  individual public rankings for wellbeing.
- **Recognition surfacing** (Prefect, House Captain, Sports Captain, Star of the
  Week) converts real school honours into status the student sees daily.

Sources: see end of file.

## Pooled world-best feature list, by theme

### 1. Points / XP economy
- Multiple point currencies, not one: **Discipline points** (attendance/punctuality),
  **Diligence points** (homework on time), **Reading points** (library issues/returns,
  reading minutes), **Participation points** (events joined/attended), **Character
  points** (teacher-awarded for NEP values: respect, teamwork, integrity).
- **Transparent earning rules** shown to the student ("On-time homework = +10").
- **Teacher-/staff-awarded bonus points** with a reason (the ClassDojo pattern) —
  manual, fast, mobile-friendly.
- **Point decay / season reset** optional, so a fresh term resets the race.

### 2. Badges & achievements (collectible)
- **Tiered badges**: Bronze → Silver → Gold → Platinum for the same skill
  (e.g. "Perfect Week" → "Perfect Month" → "Perfect Term" attendance).
- **One-off milestone badges**: "First homework submitted", "10 books read",
  "Joined first competition", "100-day streak".
- **NEP life-skill badges**: Collaboration, Critical Thinking, Communication,
  Creativity, Citizenship, Curiosity — awarded by teachers, tie to NEP competencies.
- **Surprise / rare badges** to keep it interesting (e.g. "Comeback Kid" for
  recovering attendance after a dip).
- **Badge detail card**: criteria, date earned, who/what awarded it, evidence.

### 3. Streaks & habits
- **Attendance streak** (consecutive present days), with freeze-aware logic
  (holidays/weekends/approved leave do NOT break a streak).
- **Homework streak** (consecutive on-time submissions).
- **Reading streak** (consecutive days/weeks with a library activity).
- **Streak milestones** trigger badges and bonus points; near-miss nudges
  ("1 day to your 30-day streak!").

### 4. Levels & progression
- **Level = f(total XP)** with a friendly curve and rank names suited to Indian
  schools (e.g. "Scholar I → V", or house-themed ranks).
- **Progress bar to next level** front and centre.
- **Avatars / banners that unlock** with levels (cosmetic, no purchase).

### 5. Leaderboards (wellbeing-safe)
- **House leaderboard** (reuses existing `houses.points`) — the headline board.
- **Section/class leaderboard** — opt-in, team framing.
- **"My rank in my section"** shown privately even when public board is off.
- **Weekly "movers"** (most improved) instead of only absolute toppers.
- Admin toggle to **hide individual public ranking** entirely (default for primary).

### 6. Recognition surfacing (the NEXLI differentiator)
- Surface **Prefect / House Captain / Sports Captain / Monitor / Club lead** as a
  prominent, dated honour on the dashboard.
- **Star of the Week / Student of the Month** spotlights.
- Recognition reuses the student's existing `tags` and a new `recognitions`
  collection so it is auditable and time-bound (term-scoped roles).

### 7. Quests / challenges (later phase)
- **Time-boxed challenges** ("Attend every day this week", "Read 3 books this month",
  "Join a sports event this term") with a clear reward.
- **Class / house challenges** (collective goals) for teamwork.

### 8. Rewards & redemption (later phase)
- **Reward catalogue** the school defines (no-homework pass, library privileges,
  certificate, assembly shout-out) redeemable with points — keeps it real-world,
  zero-cost, India-appropriate.
- **Redemption approval** by a teacher/coordinator.

## What makes it easy for users (UX principles)
- **Zero new data entry for students** — everything is computed from attendance,
  homework, library, events the school already records. The student just *sees* it.
- **One glance**: streak, level/XP, next badge, house rank, recognitions — above
  the fold on the student dashboard.
- **Teacher award in 2 taps** from a roster (reason + points), like ClassDojo.
- **Explainable**: every point has a source row ("+10 on-time homework, 14 Jun").
  No black box → builds trust with parents.
- **Wellbeing guardrails**: team leaderboards by default, "most improved" framing,
  admin kill-switch per board, no public bottom-ranking.
- **Offline-first / Spark-tier friendly**: scoring runs client-side from collections
  already subscribed; no Cloud Functions needed for v1.
- **Parent visibility**: the same earned badges/streaks appear (read-only) in the
  parent portal so it reinforces at home.

## Mapping to NEXLI data we already have
| Game mechanic | Source NEXLI data | Collection |
|---|---|---|
| Attendance streak / Discipline pts | daily attendance marks | `schools/{id}/attendance` |
| Homework streak / Diligence pts | submissions + due dates | `schools/{id}/homework_submissions`, `homework` |
| Reading pts / streak | library issues/returns | `schools/{id}/library_*` (issues) |
| Participation pts | event registrations | `schools/{id}/event_registrations`, `events` |
| House leaderboard | house points | `schools/{id}/houses` |
| Recognitions | student tags + new register | `schools/{id}/students.tags`, new `recognitions` |
| Character / NEP badges | teacher awards | new `point_awards`, `student_badges` |

## Sources
- [Top Gamified LMS Platforms 2025 — Learnyst](https://blog.learnyst.com/top-gamified-lms-platforms-to-boost-learner-engagement-in-2025)
- [ClassDojo alternatives — ClassPoint](https://www.classpoint.io/blog/classdojo-alternatives)
- [Gamification with points, badges & rewards — BuddyBoss](https://buddyboss.com/blog/gamification-for-learning-to-boost-engagement-with-points-badges-rewards/)
- [Gamification of Learning — Park University](https://www.park.edu/blog/the-gamification-of-learning-engaging-students-through-technology/)
- [Gamification in Education ideas — University of San Diego PCE](https://pce.sandiego.edu/gamification-in-education/)
