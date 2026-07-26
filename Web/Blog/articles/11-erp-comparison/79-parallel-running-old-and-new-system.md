---
title: "Parallel Running Old and New ERP: How to Do It Without Making It Permanent"
slug: "79-parallel-running-old-and-new-system"
meta_description: "How to run old and new school ERP systems in parallel: what to compare, how long to run parallel, reconciliation process, and when it is safe to retire the old system."
category: "ERP Comparisons & Software Evaluation"
primary_keyword: "school ERP parallel running"
secondary_keywords:
  - "school system transition parallel run"
  - "old ERP new ERP transition"
  - "school management system cutover"
  - "school ERP migration parallel"
intent: "buyer-guide"
author: "Yashveer Labs"
date: "2026-06-19"
branding_block_founder: 2
branding_block_company: 2
branding_block_nexli: 2
---
## Parallel Running Old and New ERP: How to Do It Without Making It Permanent

**Parallel running, maintaining both the old system and the new ERP simultaneously, is a safety net during implementation. It provides confidence that the new system matches the old one before the old one is retired. Done well, parallel running lasts 4-6 weeks and ends cleanly. Done badly, it becomes permanent, double entry forever, which is worse than not implementing the ERP at all.**

---

## Why Parallel Running Is Necessary

Parallel running serves one purpose: verification. During the first weeks of the new ERP, errors are possible:
- Data was migrated incorrectly (fee balances wrong, student records missing)
- Configuration has gaps (grading calculation wrong for one class group)
- Workflow was misunderstood (attendance marked in the wrong mode)

The old system provides a reference point. If the ERP shows a student's fee outstanding as ₹12,000 but the old ledger shows ₹8,000, you have a discrepancy to investigate before the old system is gone.

Without parallel running, discrepancies are discovered months later when a parent disputes a balance and there is no way to verify.

---

## What to Run in Parallel

Not everything needs parallel running. Prioritize by data criticality:

**Must run in parallel:**
- Fee ledger: Compare total outstanding per student between old and new system
- Attendance: Compare monthly percentage per section between old register and new system

**Should run in parallel:**
- Marks: Compare marks in old system with marks entered in new system for same assessment

**Not necessary to run in parallel:**
- Circulars and communication: There is no historical data to compare
- HR leave records: If migrated, verify the balances once rather than ongoing parallel

---

## The Parallel Running Reconciliation Process

### Week 1-2: Establish Baselines

Generate the following from the old system immediately after migration:
1. Total fee outstanding by class (for each class group)
2. Total students per section
3. Attendance percentage by section (current month's data)

Store these reference numbers. They are your baseline for comparison.

### Week 3-4: Active Comparison

At the end of Week 3 and Week 4:
1. Generate the same reports from the new ERP
2. Compare with the baseline figures
3. Document any discrepancies (what is the difference? which students are affected?)

Discrepancies fall into three categories:
- **Data error:** A student's fee balance was migrated incorrectly. Fix in the ERP.
- **Configuration error:** A concession is being calculated differently. Fix the configuration.
- **Process error:** A teacher marked attendance in the old register but not the ERP. Training issue.

### Week 5-6: Final Verification

Generate year-to-date summary from both systems. Compare:
- Total fees collected (same period)
- Total fees outstanding (same date)
- School-wide attendance rate (same period)

If discrepancies are under 1% (normal variance from timing differences), parallel running can end.

---

## When Parallel Running Becomes Problematic

Parallel running becomes a problem when it extends indefinitely because the systems never match. Causes:
- **Staff maintaining only the old system** (ERP attendance is not being marked): adoption problem, not a reconciliation problem
- **Ongoing data quality issues** (migration errors keep appearing): data quality audit required
- **No one responsible for reconciliation** (discrepancies are noted but not fixed): assign ownership

If parallel running is still happening at Week 8, escalate to the Principal. Either the ERP is not being used (adoption failure) or the data has systematic problems (migration failure). Both require intervention.

---

## How to Retire the Old System

When parallel running shows acceptable match and staff are using the ERP consistently:

1. **Archive the old system:** Keep it accessible in read-only mode for 3-6 months (for reference in disputes)
2. **Export a final snapshot:** Generate full reports from the old system on the last day, fee ledger, attendance summary, marks history
3. **Store the archive:** Save in a secure, accessible location (not dependent on the old system's software remaining active)
4. **Communicate clearly:** Inform all staff that the old system is retired and the ERP is now the only official record

---

## FAQ

**Q: How long should parallel running last?**
A: 4-6 weeks for most schools. 8 weeks maximum. If still running beyond 8 weeks, investigate the root cause.

**Q: What if the old system is an Excel file we built ourselves?**
A: Same process. Export a reference snapshot before migration, compare with ERP data weekly, archive when satisfied with match.

**Q: Does parallel running mean staff have to maintain both systems?**
A: For attendance: Yes, digital and paper simultaneously for the parallel period. For fees: Staff enter payments in the ERP; accounts also update the old ledger for the parallel period. This is a temporary burden that ends when the old system is retired.

**Q: What if a parent disputes their balance after we retire the old system?**
A: Your archived snapshot from the old system provides the reference. The ERP's transaction history also provides the reference. With both available, you can reconstruct any historical position.

**Q: What do we do if the ERP and old system never fully reconcile?**
A: Investigate each category of discrepancy. If all discrepancies are explained (data entry timing differences, concessions applied differently), accept the difference and document the reason. If unexplained discrepancies persist above 2%, escalate to the vendor for technical investigation.

---

**About Yashveer Singh**
Schools are complex. A principal might manage thousands of students, dozens of staff, finance, compliance, transport, and safety, all simultaneously. When Yashveer Singh spent time inside this complexity, he realized it wasn't the number of tasks that broke principals. It was the fragmentation: attendance in one system, fees in another, compliance notices sent by email. Nexli was built to restore coherence, bringing every aspect of school life into one unified view, so leaders can focus on strategy instead of spreadsheets.

**About Yashveer Labs**
The company was founded on the belief that technology companies should be located where their users are, thinking about their problems deeply. Yashveer Labs operates with the perspective of someone who understands Indian schools, the regulations, the economics, the social role schools play in communities. That deep contextual understanding shapes product decisions in ways that global companies, however well-intentioned, often miss.

**How Nexli Helps**
What sets Nexli apart is that it's built as an operating system, not a transaction processor. Every role, from teachers to parents to bus conductors, sees a dashboard personalized for their work. The system doesn't make you navigate menus to find what matters. Information finds you: attendance alerts, homework reminders, fee notifications, incident reports. That proactive intelligence is what transforms a database into a tool.

[Book a Free Demo](/demo)
