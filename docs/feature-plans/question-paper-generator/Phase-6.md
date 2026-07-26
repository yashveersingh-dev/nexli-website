# Question Paper Generator — Phase 6 (AI: Generation, Tagging, Variants, Translation)

> The premium tier. Every AI capability is **gated behind the existing `ai` feature flag + `AILockedOverlay`**, with a human-in-the-loop review before anything is saved. This is the only phase that needs a paid plan + API key + a server proxy.

---

## ⚠️ Hard dependency note (state plainly — never fake a live service)
AI here requires **all** of:
1. An **AI API key** (e.g. Anthropic Claude — see repo's existing `insights`/`ai` flag usage).
2. **Firebase Blaze plan** (Spark blocks outbound network from Cloud Functions; the AI call must go through a callable Function / server proxy so the key is never in the client).
3. The school's `ai` feature flag ON (already in `lib/featureFlags.ts` / nav `ai:true`).

If any is missing, the surfaces render the existing **`AILockedOverlay`** with an upgrade prompt — no degraded/fake output.

---

## A. AI question generation (human-in-the-loop)
- "Generate questions" from: a chapter/topic, pasted textbook passage, or a learning-outcome code. AI drafts MCQs / case-studies / HOTS / numericals **with answers, solutions, Bloom + difficulty tags**.
- Drafts land in the **moderation queue as `draft`** (never auto-published); teacher edits/approves.
- "Generate a balanced paper in 3 minutes" wizard: class + subject + chapters + total marks → AI proposes a full blueprint-satisfying paper for review.

## B. AI auto-tagging & enrichment
- Batch **auto-tag** legacy/imported questions: Bloom level, difficulty, topic, competency flag, expected time.
- **Distractor generation** for MCQs (plausible wrong options).
- **Variant generation**: change numbers/context of a numerical to create fresh equivalents (great for multiple sets).
- **Solution writer**: draft step-wise marking scheme for subjective questions.

## C. AI translation (pairs with Phase 4)
- Auto-translate a question to Hindi/regional languages → creates a `linkedTranslationId` twin in `draft` for teacher review (never silently published). Preserves maths/LaTeX.

## D. AI quality & insights
- **Ambiguity/error check**: flag questions with unclear stems, multiple defensible answers, or answer-key mismatches.
- **Difficulty prediction** before any results exist (complements Phase-3 empirical stats).
- **Coverage advisor**: "your bank has 0 Analyse-level questions in Chapter 4 — generate some?"

## Build order
1. Callable Function proxy for AI (key server-side); reuse `insights` AI plumbing if present.
2. Generation UI behind `AILockedOverlay`; all output → moderation `draft`.
3. Batch auto-tag + distractor/variant/solution tools.
4. AI translation into the Phase-4 pair model.
5. Quality checks + coverage advisor.

## Dependencies / flags
- **AI API key + Blaze + `ai` flag** (all three) — else locked overlay.
- Human review **mandatory** before any AI content enters the approved bank.

## Definition of done
- With AI enabled, a teacher generates, tags, varies, and translates questions — every result reviewed before save.
- With AI disabled/unconfigured, all AI surfaces show the standard locked overlay; the rest of the generator is unaffected.
