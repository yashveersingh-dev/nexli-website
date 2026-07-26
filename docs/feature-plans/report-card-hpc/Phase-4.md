# Report Card / NEP HPC — Phase 4 (AI Remarks, 360° Synthesis, Translation, Early-Warning)

> The premium tier. Every AI capability is **gated behind the existing `ai` feature flag + `AILockedOverlay`** (Nexli already has an AI Insights surface), with a **human-in-the-loop** review before anything is saved or published. This is the only phase needing a paid plan + API key + server proxy.

---

## ⚠️ Hard dependency note (state plainly — never fake a live service)
AI here requires **all** of:
1. An **AI API key** (e.g. Anthropic Claude — reuse the repo's `insights`/`ai` plumbing).
2. **Firebase Blaze plan** (Spark blocks outbound network from Functions; the AI call must run through a callable Function / server proxy so the key is never client-side).
3. The school's **`ai` feature flag** ON (already in `lib/featureFlags.ts`; nav uses `ai:true` + `AILockedOverlay`).

If any is missing, every AI surface renders the existing **`AILockedOverlay`** with an upgrade prompt — no degraded/fake output. The rest of the report-card/HPC engine (Phases 1–3) is fully usable without AI.

---

## A. AI remark drafting (the headline feature)
- From a student's marks + domain ratings + attendance + 360° inputs, draft a **personalised, constructive, bilingual** narrative for: overall remark, class-teacher remark, strengths, areas-to-improve.
- Output is an **editable draft** in the card editor — teacher reviews/edits; publishing still goes through the normal approval workflow (never auto-published).
- Tone presets (encouraging / formal / detailed) and length control; bilingual (English + Hindi/regional in one go).

## B. 360° synthesis (HPC)
- Synthesise teacher + self + peer + parent inputs into a coherent **holistic summary** and **developmental-goal suggestions**, highlighting agreements/discrepancies across viewpoints — teacher reviews.
- Suggest competency descriptors from evidence notes (teacher confirms).

## C. AI translation
- Translate a whole card (labels + remarks + descriptors) to Hindi/regional languages → draft for review (preserves the structured layout). Complements the Phase-3 bilingual fonts.

## D. Early-warning & nudges (proactive, before report time)
- Detect **declining trends** (marks down across terms), **attendance risk**, or **missing 360° inputs** and nudge the class teacher/coordinator *before* the reporting deadline.
- Suggest students for counselling/remediation (links to `features/counseling`).
- A term-readiness panel: "Class 6B — 4 cards missing parent feedback, 2 attendance gaps".

## E. Quality & consistency checks
- Flag remarks that are generic/templated, contradictory grades, or totals that don't reconcile.
- Suggest improvements to vague remarks.

## Build order
1. Callable Function AI proxy (key server-side); reuse `insights` AI plumbing.
2. Remark-drafting UI in the card editor behind `AILockedOverlay`; output → editable draft only.
3. 360° synthesis + competency-descriptor suggestions (HPC).
4. Whole-card AI translation into the Phase-3 bilingual layout.
5. Early-warning/nudge panel in `ProgressHub` + counselling link.
6. Consistency/quality checks.

## Dependencies / flags
- **AI key + Blaze + `ai` flag** (all three) — else locked overlay.
- Human review **mandatory** before any AI remark enters a card; approval workflow unchanged.

## Definition of done
- With AI enabled, teachers get reviewable, bilingual, personalised remark drafts and 360° syntheses; nothing auto-publishes.
- Early-warning surfaces at-risk students before reporting deadlines.
- With AI disabled/unconfigured, all AI surfaces show the standard locked overlay; Phases 1–3 work fully without it.
