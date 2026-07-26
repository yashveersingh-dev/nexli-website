# AI At-Risk / Dropout Early-Warning + Intervention — Research

> Pooled "world-best" feature set for a student early-warning + intervention product, tailored to Indian schools. Benchmarks: EWS (Early Warning Systems) research, ABC indicators (Attendance/Behaviour/Course-performance), MTSS / RTI tiered support, BrightBytes, Hoonuit/Otus, Panorama Student Success, Civitas (higher-ed), UNESCO/NEP 2020 dropout-reduction goals.

## 1. Risk signals (the inputs)
- **Attendance**: absence rate, tardies, consecutive absences, period-skipping, sudden drop vs baseline.
- **Behaviour**: discipline incidents, suspensions, counselling referrals, safeguarding flags (ties to existing safeguarding module), peer-conflict.
- **Course performance**: failing core subjects, GPA/percentage drop, missing assignments, sudden grade decline, re-test frequency.
- **Engagement**: LMS/portal logins, assignment submission timeliness, participation.
- **Context/socio-economic (sensitive, consented)**: fee-default/financial stress, distance/transport issues, first-generation learner, language barrier, repeated grade, health/wellbeing, family events.
- **The "ABC" core**: research consistently shows Attendance + Behaviour + Course-performance are the strongest, most actionable early predictors — even small combined dips matter.

## 2. Scoring & detection
- **Rules engine (transparent, explainable)** as the foundation: weighted indicators → composite risk score → risk band (Low/Watch/At-Risk/High). Thresholds + weights are configurable per school/board.
- Trend detection (deteriorating vs stable vs improving), not just snapshots; momentum matters more than absolute.
- **Why-flagged transparency**: each score shows the contributing factors ranked — essential for trust and action (no black box for high-stakes decisions about children).
- **Optional ML layer (later)**: pattern model learns from historical outcomes to catch non-obvious combinations — strictly **decision-support**, never auto-action; bias-audited; explainable (factor attributions).
- Cohort/grade-level screening + individual deep-dive.

## 3. Intervention workflow (MTSS-aligned)
- **Tier 1** universal supports; **Tier 2** targeted small-group; **Tier 3** intensive individualised — auto-suggest tier from risk band.
- Intervention plan: assign owner (class teacher/counsellor/coordinator), goals, actions, due dates, check-ins, parent involvement.
- Action library (mentoring, attendance contract, remedial classes, counselling referral, home visit, fee-relief referral) with templates.
- Progress monitoring: did the score improve? close/escalate/continue; outcome logging.
- Case management: caseload view per counsellor, SLA, reminders, full history.

## 4. Dashboards & reporting
- Leadership: school-wide risk distribution, trends, at-risk count by grade/section/cohort, intervention effectiveness.
- Teacher: my-class watchlist, who needs attention, quick-log a concern.
- Counsellor: caseload, open plans, escalations.
- Equity lens: are interventions reaching the right students; outcome gaps.

## 5. Alerts & nudges
- Threshold-crossing alerts to the right owner; weekly digest; "student X moved from Watch → At-Risk."
- Positive signals too (improvement) to reinforce what's working.

## 6. Privacy, ethics & governance (critical for minors)
- Explainable, contestable scores; human always decides; never label a child publicly.
- Access strictly need-to-know; sensitive socio-economic data consented + minimised (DPDP Act 2023).
- Bias/fairness auditing; avoid self-fulfilling labelling; data-retention limits; audit trail of who saw what.

## 7. UX principles
- Scores are a starting conversation, not a verdict — UI frames them as "needs attention," shows the why, and pushes to action.
- One-click from flag → intervention plan → parent loop.
- Calm, supportive tone; no stigma; teacher can log a gut-feel concern that feeds the model.

## 8. India-specific notes
- NEP 2020 + RTE focus on reducing dropouts (esp. transitions class 5→6, 8→9, girls, migrant/seasonal, first-gen learners) — model these transition risks explicitly.
- Strong predictors locally: fee default/financial stress, long commute/transport, language of instruction mismatch, child labour/marriage risk, monsoon/harvest-season absence.
- Integrate with existing Nexli attendance, exams, fees, counselling, and safeguarding modules as data sources.
- Works fully on a transparent rules engine — **no AI/LLM key required for v1**; LLM only later for narrative summaries/recommendations.

## Sources
- [AI-Powered Early Warning Systems & Student Retention — Evelyn Learning](https://www.evelynlearning.com/blog/the-student-retention-crisis-how-ai-powered-early-warning-systems-are-predicting-dropouts-85-earlier-and-saving-universities-23-billion)
- [Advancing School Dropout Early Warning Systems — IAFREE model (PMC)](https://www.ncbi.nlm.nih.gov/pmc/articles/PMC10425558/)
- [What is MTSS? — Understood.org](https://www.understood.org/en/articles/mtss-what-you-need-to-know)
- [AI Early Warning Dashboards Spot At-Risk Students — SOLVED](https://www.solvedconsulting.com/blog/ai-early-warning-dashboards-at-risk-students)
