# Gamified Dashboard — Phase 3 (quests, rewards, automation)

> The "standalone-grade" depth: time-boxed quests/challenges, a real-world reward
> economy the school controls, collective house/class goals, and (where the plan
> allows a paid tier) server-side automation for nudges.

## New capabilities

### 1. Quests & challenges
- New `quests` collection:
  ```
  { id, title, description, icon, type: 'individual'|'class'|'house',
    goal: { metric: 'attendance'|'homework'|'reading'|'events', target, window },
    rewardPoints, rewardBadgeDefId?, startDate, endDate, seasonId, active,
    audienceScope: { sectionIds?, houseIds?, all? }, createdBy }
  ```
- `quest_progress` `{ id, questId, studentId, current, target, completed, completedAt }`.
- Engine computes progress from the same live metrics; completion auto-awards
  points/badge. Examples: "Attend every day this week", "Read 3 books this month",
  "Join one inter-house event this term".
- **Collective goals**: class/house quests aggregate all members' progress into a
  shared bar — drives teamwork (the Classcraft pattern).

### 2. Reward catalogue & redemption (real-world, zero-cost)
- `rewards` collection (school-defined): `{ id, title, costPoints, type:
  'privilege'|'certificate'|'shoutout'|'physical', stock?, active }`.
  India-appropriate: "Homework pass", "Front-of-line at canteen", "Library extra
  loan", "Assembly shout-out", "Principal's commendation certificate".
- `redemptions` `{ id, studentId, rewardId, costPoints, status:
  'requested'|'approved'|'fulfilled'|'rejected', requestedAt, approvedBy, ... }`.
- Student spends earned points (a `redeemable` balance separate from leaderboard XP
  so spending never lowers rank); teacher/coordinator approves and fulfils.
- Certificate redemptions reuse the existing **Certificate Generator** module.

### 3. Avatars / cosmetic unlocks
- Level-gated avatar frames / banners (cosmetic, no purchase, no real money).
- `student_cosmetics` `{ studentId, unlocked: string[], equipped }`.

### 4. Automation (gated — needs paid Blaze / Cloud Functions)
- ⛔ Nightly scheduled recompute of streaks + "streak-at-risk" + leaderboard
  snapshots, and **push/WhatsApp/inbox nudges** ("1 day to your 30-day streak!").
- Until Blaze is enabled, keep Phase 1's on-load recompute; ship the offline UI for
  nudges (banner on next login) so no live channel is faked.

## Screens
- `QuestsPage` (student: active quests + progress; staff: create/manage).
- `RewardStorePage` (student: browse + redeem) and `RedemptionQueue` (staff approve).
- Avatar picker in profile.

## Role gating
- Quest + reward creation: coordinator/HOD/VP-Academic/principal.
- Redemption approval: class teacher and above.
- Students: view + request redemption only.

## Cross-module reuse
- Certificate generator for reward certificates.
- Communication/messaging for nudges (offline banner now, live later).
- Competency data flows into HPC + Skills Passport.

## Acceptance
- A student can complete a quest computed from real activity and auto-receive the
  reward; a house quest aggregates members correctly.
- Points can be spent in the reward store without affecting leaderboard XP;
  redemptions move through the approval queue.
- All automation that requires Blaze is clearly shelled offline, never faked.
