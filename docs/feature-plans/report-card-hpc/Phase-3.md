# Report Card / NEP HPC — Phase 3 (Portfolio, Bilingual, Trends, Analytics, Format Designer)

> Phase 3 adds the polish and depth that make the cards genuinely best-in-class: **portfolio/evidence attachments, bilingual cards, multi-term trend charts, class analytics, and a per-board format designer**. Image upload touches Storage quota (flagged); fonts are offline/free.

---

## A. Portfolio & evidence attachments (Firebase Storage — quota-flagged)
- Attach **work samples, project photos, activity evidence** to a card (HPC "Parent Feedback & Portfolio" + competency `evidence`).
- Stored under `schools/{id}/portfolios/{studentId}/…`; thumbnails on screen; printed as a portfolio strip/grid in `HpcCardDoc`.
- ⚠️ **Quota note:** Spark Storage is limited (a few GB + daily download caps); a portfolio of photos per student can grow fast — show usage and warn near caps (reuse `lib/usage.ts`). URL-paste remains a free fallback.
- **Observation/anecdotal log** captured through the term (a lightweight `observations` subcollection) auto-surfaced into the card.

## B. Bilingual report cards & HPC (offline fonts)
- Per-card / per-scheme **secondary language** (Hindi/regional): bilingual labels, remarks, descriptors — standard for Indian report cards.
- Self-hosted **Indic fonts** (Noto Sans Devanagari etc.) — shared static assets with the Question-Paper & Certificate modules; offline, free.
- Locale-aware dates/numbers via `lib/format.ts` + `dayjs`.
- Remark phrase bank gains bilingual entries.

## C. Multi-term & trend visualisation
- **Cumulative view**: Term 1 + Term 2 → Annual roll-up (traditional); domain trend across terms (HPC).
- **Trend charts** on the card and in the parent view: per-subject term-over-term line, domain radar over time (reuse `RadarChart` + `lib/legacy-charts.reference.js`/analytics chart components).
- "Progress over time" narrative auto-summary (rule-based in Phase 3; AI version in Phase 4).

## D. Class & cohort analytics
- **Class performance dashboard**: subject-wise averages, grade distribution, toppers, weak areas, attendance correlation.
- Feeds the **Certificate module** (auto merit/topper lists) and teaching decisions.
- Export to CSV (reuse events `exportRegistrations` pattern); printable class result summary.

## E. Report-card format designer (per board/class)
- A configurable layout: which sections appear, column order, scales, header/logo, watermark, signatory labels, grade legend text — per board (CBSE/ICSE/state) and stage.
- Save as reusable format; clone last year's; lock approved formats. (Lighter than the certificate drag-drop designer — section toggles + ordering + branding.)

## Build order
1. Storage attachments + observation log subcollection (behind quota guard); render portfolio in docs; keep URL fallback.
2. Bilingual scheme/card fields + Indic fonts + locale formatting + bilingual phrase bank.
3. Multi-term roll-up + trend charts on cards and parent view.
4. Class analytics dashboard + CSV export + result summary print.
5. Format designer (section toggles, ordering, branding, legends).

## Dependencies / flags
- **Firebase Storage** (Spark-limited; warn on quota) — portfolio images; URL fallback free.
- **Self-hosted Indic fonts** — static, free, offline.
- No AI, no paid plan.

## Definition of done
- Cards carry portfolio/evidence (within quota) and an observation log.
- Bilingual report cards/HPC print correctly with Devanagari.
- Term-over-term trends render on the card and in the parent portal.
- A class analytics dashboard exists and exports; format designer lets schools tailor the layout per board.
