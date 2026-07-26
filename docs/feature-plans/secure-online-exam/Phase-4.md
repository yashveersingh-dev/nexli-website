# Secure Online Exam — Phase 4: Onscreen Evaluation (OSE) + AI-Assist Grading

Onscreen-marking workspace is **buildable now offline** with sample scanned sheets and digital subjective answers. **AI-assisted subjective scoring is BLOCKED on an LLM API key** — until then, examiners mark manually and AI-assist is hidden/disabled.

## Scope
1. **Answer ingestion** — native digital subjective answers (from CBT player) + uploaded scanned answer-sheet images/PDFs for pen-paper exams.
2. **Examiner marking workspace** — anonymised allocation, PDF/image annotation (tick/cross/comment stamps), per-question/per-step marks entry, rubric panel, save/lock.
3. **Evaluation governance** — single/double/blind evaluation, third-evaluator on discrepancy threshold, moderation, re-evaluation/rechecking, full audit trail of mark changes.
4. **Examiner ops** — allocation by subject/expertise, workload balancing, deadlines, productivity dashboard.
5. **AI-assist (BLOCKED on LLM key)** — suggested score + rubric-match rationale for subjective answers; **human-in-the-loop only, never auto-final.** Behind an `AiGradeAssistProvider` interface with a `MockAiGrader` (rule/keyword-based) usable offline so the UI exists pre-key.
6. **Combined results** — merge objective auto-scores + OSE subjective scores → final report card, percentile/rank, topic-wise analytics, re-eval reconciliation.

## Data model
```
schools/{schoolId}/exams/{examId}/evaluations/{studentId}
  allocatedTo[]        // examinerUserId(s), anonymised handle
  perQuestion{questionId: {marks, stepMarks[], annotations[], rubricScores{}}}
  status               // 'unallocated'|'in_progress'|'submitted'|'moderated'|'locked'
  evaluationType       // 'single'|'double'|'blind'
  discrepancy:bool, thirdEvaluator
  aiSuggestion{questionId: {score, rationale, provider:'mock'|'<llm>'}}  // assist only
  auditLog[]           // {field, old, new, by, ts}
schools/{schoolId}/examEvaluatorPool/{userId}
  subjects[], capacity, assignedCount, deadline
```

## Screens
- **Marking Workspace** (examiner), **Evaluation Allocation** (coordinator), **Moderation/Re-eval** queue, **Combined Result** + analytics.

## Integration seam
- `AiGradeAssistProvider` interface; `MockAiGrader` now, real LLM provider later (key-gated). Suggestions are advisory; examiner action writes the authoritative mark + audit entry.

## Role gating
- `exam.evaluate` (examiner, anonymised), `exam.evaluation.allocate`, `exam.evaluation.moderate`, `exam.results.publish`.
- Students/parents see results only after publish.

## Acceptance
Coordinator allocates scripts anonymously; examiner annotates + marks a subjective answer with rubric; double-evaluation discrepancy routes to a third; final combined result publishes with audit trail — offline. AI-assist toggles on only when an LLM key is configured.
