# AI At-Risk — Phase 3: ML Pattern Layer + LLM Narrative Insights (BLOCKED — needs AI key)

## Gate
Requires an **AI/LLM API key** (LLM provider) for narrative case summaries/recommendations, and — for the ML pattern model — **external compute / Firebase Blaze** to train/serve a model on historical outcomes. Do not enable until a key exists. `MockInsightProvider` (Phase 1) stands in until then. The rules engine remains the authoritative, explainable core; ML/LLM is **decision-support only, never auto-action.**

## Scope
1. **ML pattern model (optional)** — trained on Phase-2 intervention outcomes + historical signals to surface non-obvious risk combinations; outputs a `source:'ml'` score **alongside** (never replacing) the rules score, with factor attributions. Bias/fairness audit + explainability mandatory; held-out validation; drift monitoring.
2. **LLM narrative insights** — implement `LlmInsightProvider` behind the Phase 1 `InsightProvider` interface: plain-language "what's going on + suggested next steps" summaries for a counsellor, and digest narratives. Always human-reviewed; framed as suggestions; child PII handling per DPDP (minimise/redact what is sent).
3. **Governance** — model card, fairness report, contestability workflow (challenge a score), retention limits, full audit of model usage.

## Data model additions
```
schools/{schoolId}/riskScores/{studentId}
  mlComposite?, mlFactors[]?, mlModelVersion?    // shown beside rules score, not replacing
schools/{schoolId}/aiInsights/{insightId}
  studentId|cohort, text, provider, reviewedBy, generatedAt, redactionApplied:bool
schools/{schoolId}/modelGovernance (singleton)
  modelVersion, fairnessReportRef, lastAuditAt, retentionDays
```

## Integration seam
- `InsightProvider` pure swap (mock → LLM); ML score is an additive field — watchlist/profile UIs from Phase 1 render it as a secondary signal with its own "why."
- LLM/ML keys in server/secret config; PII minimised before any external call; nothing about a child auto-acted on.

## Role gating
- `atrisk.ai.configure` (principal/admin) to enable AI layer; insights visible only to counsellor/coordinator/principal; contestation visible to the student's guardian on request.

## Acceptance
With a key, counsellors see an ML secondary signal + an LLM narrative summary with explicit factor attributions and a "this is advisory" framing, plus a contestability path — while the rules engine remains the explainable source of truth.
