# AI At-Risk — Phase 1: Rules-Based Scoring Engine + Watchlist (FULLY Offline-Buildable)

## BLOCKED vs BUILDABLE-NOW

### Exact external dependency (BLOCKED only for the optional ML/LLM layer)
- **An AI/LLM API key** (e.g. an LLM provider key) is required **only** for the optional Phase 3 enhancements: ML pattern model training/inference at scale and natural-language case summaries/recommendations. A managed ML training pipeline would also need **Firebase Blaze**/external compute.

### Why that part is blocked (and why most of this module is NOT)
The **core early-warning system is a transparent, explainable rules engine and needs NO external service.** This is also the *ethically correct* default for high-stakes decisions about children — scores must be explainable and contestable, not a black box. We will **never auto-act on a child from an opaque model.** The LLM/ML layer is purely additive decision-support, gated behind a key, with a `MockInsightProvider` standing in until then.

### Buildable NOW, fully offline (the whole core product)
- The complete **rules-based risk-scoring engine** (ABC indicators: Attendance, Behaviour, Course-performance + context), configurable weights/thresholds, risk bands, trend detection, and **why-flagged factor attribution**.
- Watchlists + dashboards (leadership/teacher/counsellor).
- The full **MTSS-aligned intervention workflow** (plans, tiers, case management, progress monitoring, outcomes).
- Alerts/nudges, equity reporting.
- All inputs come from **existing Nexli modules** (attendance, exams, fees, counselling, safeguarding) — real data, no external API.

---

## Phase 1 scope: scoring engine + watchlist

### Data model (Firestore, under `schools/{schoolId}/`)
```
schools/{schoolId}/riskConfig (singleton)
  indicators[]{key, source, weight, direction, thresholds{watch,risk,high}}
  bands{low,watch,risk,high}, transitionRiskRules[]  // e.g. class 5->6, 8->9, girls, first-gen
  enabled
schools/{schoolId}/riskScores/{studentId}
  composite, band('low'|'watch'|'risk'|'high'), trend('improving'|'stable'|'declining')
  factors[]{key, value, contribution, label}      // why-flagged attribution (explainable)
  computedAt, source:'rules'   // 'ml' only added in Phase 3
schools/{schoolId}/riskScoreHistory/{studentId}/{yyyymmdd}
  composite, band, snapshotFactors[]
schools/{schoolId}/riskSignals/{signalId}        // normalised inputs pulled from other modules
  studentId, type('attendance'|'behaviour'|'grade'|'engagement'|'fee'|'context'), value, ts, sourceModule
```

### Scoring engine (pure, offline, explainable)
- `atrisk/score/computeRiskScore.ts` — pure function: pulls normalised `riskSignals` → applies configured weights/thresholds → composite + band + ranked `factors[]` + trend (vs `riskScoreHistory`). Deterministic, unit-testable, no external calls.
- Scheduled recompute (nightly) is desirable; on Spark, recompute on-read / on-demand / on-relevant-event (attendance marked, result published) instead of a Blaze cron.

### Screens
1. **At-Risk Watchlist** — students ranked by band/trend, filter by grade/section/cohort, each row shows top contributing factors.
2. **Student Risk Profile** — composite + band, factor breakdown ("why flagged"), history trend chart, signal timeline; one-click "Create intervention plan."
3. **Risk Config** — weights/thresholds/bands editor, transition-risk rules, preview impact on current cohort.
4. **Leadership Risk Dashboard** — distribution + trends by grade/section.

### Integration seam
- `atrisk/signals/SignalSource.ts` — adapters that read existing attendance/exam/fee/counselling/safeguarding collections and emit normalised `riskSignals`. No external network.
- `atrisk/insight/InsightProvider.ts` — interface for optional narrative summaries; Phase 1 ships `MockInsightProvider` (rule-template text). Real LLM provider = Phase 3, key-gated.

### Role gating (data-driven roles)
- `atrisk.view` — teacher (own class only), counsellor, coordinator, principal.
- `atrisk.config.manage` — admin/principal.
- Sensitive context signals (financial/health) restricted to counsellor/principal; access audit-logged. Scores never exposed to students/peers. All scoped by `schoolId`.

### Phase 1 acceptance
Using real data from existing modules, the engine computes explainable risk scores; a teacher sees a class watchlist with "why flagged" factors and trend; admin tunes weights and previews cohort impact — fully offline, no AI key.
