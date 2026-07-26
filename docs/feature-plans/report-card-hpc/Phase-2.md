# Report Card / NEP HPC — Phase 2 (Deepen the NEP HPC: 360°, Stage Templates, Competencies, Multi-Teacher)

> Phase 2 upgrades the **existing HPC** from a teacher-only, free-text card into the true PARAKH/NCERT **360° holistic card**: structured self/peer/parent inputs, stage-specific templates, competency/learning-outcome ratings, multi-teacher contribution, and the signature NCERT sections. Still offline, no AI.

---

## A. Extend the HPC data model (build on `types/special.ts` `HpcCard`)
Add fields (keep existing ones for backward compatibility):
```
stage: 'foundational'|'preparatory'|'middle'|'secondary',
selfAssessment?: { prompt:string; response:string; visualScale?:number }[],
peerAssessment?: { peerName?:string; prompt:string; response:string }[],
parentFeedback?: { prompt:string; response:string; submittedAt?:number }[],
abilities?: { ability:string; descriptor:string }[],     // beyond the 6 domains
competencies?: { subject:string; loCode?:string; descriptor:string; evidence?:string }[],
aboutMe?: { likes?:string; interests?:string; dream?:string; ... },   // "All About Me"
glimpse?: { note?:string; imageUrl?:string },                          // "A Glimpse of Myself"
developmentalGoals?: { domain:string; goal:string; status:'emerging'|'developing'|'achieved' }[],
contributions?: { byUid:string; byName:string; role:string; section:string; at:number }[],  // multi-teacher audit
```
Domains/descriptors already exist (`HPC_DOMAINS`, `HPC_RATING_DESCRIPTORS`).

## B. 360° contribution workflows
- **Self-assessment form** (`HpcSelfPage` in student portal): age-appropriate prompts; **visual/emoji scale** for foundational classes; saves into `selfAssessment`.
- **Peer-assessment** (structured, teacher-mediated; anonymised aggregation into `peerAssessment`).
- **Parent-feedback form** (`HpcParentPage` in parent portal): home observations, reading/play habits, a parent note → `parentFeedback`. (Reuse `MyHpcPage` portal plumbing.)
- **Multi-teacher input**: each subject teacher fills their `competencies`/domain lines; class teacher **consolidates**. Permission-scoped so a teacher edits only their subject's lines; `contributions[]` records who added what (audit). The consolidate step is part of the existing draft phase before submit.

## C. Stage-specific templates (the card looks right per class)
- Template selector by `stage` (auto from the student's grade): Foundational (play/ability summaries + "Glimpse"/"All About Me"), Preparatory, Middle (subject competencies + abilities).
- Extend `HpcCardDoc` to render per-stage sections (conditionally show Glimpse, All About Me, Developmental Goals, Self/Peer/Parent, Portfolio).
- Descriptor legend printed; radar (existing `RadarChart`) for domains; ability list.

## D. Competency / learning-outcome based ratings
- Replace/augment plain subject "grade" with **competency descriptors** mapped to **NCERT learning-outcome codes** (`loCode`), with optional **evidence** notes — NEP's anti-rote intent.
- Reuse a curated LO list per subject/grade (seed data); teacher rates each as a descriptor.

## E. Cross-card workflow board (unify with report cards)
- The `ProgressHub` (from Phase 1) shows, per class/term, a matrix of each student's **report card** and **HPC** status (draft/submitted/approved) plus which 360° inputs are still missing ("3 parent feedbacks pending").
- Reminders/nudges (in-app) to parents/students to complete their part (reuse communication).

## Build order
1. Extend `HpcCard` type + `hpcSchema.ts` for the new structured fields (keep old fields).
2. Stage detection + per-stage template config; extend `HpcCardDoc` sections + descriptor legend.
3. Self / peer / parent forms in the respective portals → write into the card; aggregation rules.
4. Multi-teacher subject-line contribution with permission scoping + `contributions[]` audit; consolidate step.
5. Competency/LO ratings (seed LO list); render on the card.
6. `ProgressHub` 360°-status matrix + completion nudges.

## Dependencies / flags
- No new libraries, no AI, no paid plan. (Portfolio *images* and bilingual are Phase 3.)
- 360° inputs depend on **parents/students having portal logins** (already in Nexli); if a parent has no login, the teacher can enter parent feedback on their behalf (documented fallback, not faked).

## Definition of done
- An HPC now carries structured **teacher + self + peer + parent** inputs (true 360°).
- Cards render with the **correct stage template** and the NCERT signature sections.
- Subject teachers contribute their lines; class teacher consolidates; everything audited.
- The Progress hub shows what's complete vs pending per student per term.
