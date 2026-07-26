#!/usr/bin/env python3
"""Enhance articles to reach 1,200-1,800 word target."""

import os
import re

def enhance_article(filepath):
    """Add expanded sections to reach word count target."""

    with open(filepath, 'r', encoding='utf-8') as f:
        content = f.read()

    # Calculate current word count
    body = content.split('---\n', 2)[2]  # Skip frontmatter
    current_words = len(body.split())

    # If already in target range, skip
    if 1200 <= current_words <= 1800:
        return

    # Find insertion point: before "How Nexli Solves This"
    insertion_point = content.find("## How Nexli Solves This")

    if insertion_point == -1:
        return

    # Create expansion content based on article number
    filename = os.path.basename(filepath)
    is_cat1 = "01-school-admin" in filepath
    article_num = int(filename.split('-')[0])

    if is_cat1:
        if article_num == 1:
            expansion = """
## Real-World Implementation Example

Consider a mid-sized school with 500 students. Before implementing a centralized system:
- Principal spent 2 hours daily on administrative issues that didn't require her expertise
- Attendance office staff processed forms manually, taking 30 minutes per class per day
- Fee collection was chaotic: some payments recorded, others forgotten, and multiple ledgers had conflicting data
- Teachers couldn't answer parent queries about their child's attendance or academic standing
- Board meetings were delayed because financial reports weren't ready

After implementation:
- Attendance is marked once (biometric) and automatically flows to student records, fee calculations, and parent dashboards
- The principal can see real-time dashboards showing enrollment status, fee collection trends, and attendance patterns
- Teachers access student data instantly during parent-teacher meetings
- Fee collection improved 25% because parents get automatic reminders and can see outstanding balances
- Board meetings start on time with printed dashboards and compliance reports ready

---

## Common Implementation Challenges and How to Overcome Them

**Challenge 1: Data Migration from Legacy Systems**

Schools often have years of data in spreadsheets, paper files, or old databases. Migrating this data is daunting.

*Solution:* Plan a phased migration. Start with current-year data (students, staff, fees), migrate cleanly, and leave historical data in read-only archives. You don't need to migrate 10 years of old data—just validate it exists and can be retrieved if needed.

**Challenge 2: Staff Resistance to New Systems**

Some teachers or office staff worry that new systems will be complicated or make them redundant.

*Solution:* Involve them early. Show them the benefits (less repetitive work, more time for actual teaching/mentoring). Provide hands-on training, not just written manuals. Celebrate early wins: "See how fast attendance marking is now?"

**Challenge 3: Inconsistent Data Entry**

Even with a system in place, if staff enter data inconsistently, reports are unreliable.

*Solution:* Set clear data entry standards. Create checklists. Audit data monthly. Provide feedback: "We noticed 15% of attendance entries are incomplete—let's fix this together."

**Challenge 4: Initial Cost Concerns**

Systems aren't free. Budgets are tight.

*Solution:* Calculate ROI: If one administrator's time is freed up, how much value is that? If fee collection improves 15%, how much additional revenue? If board compliance saves an inspection fine, how much savings? Often, ROI happens in year 1.

"""
        elif article_num == 2:
            expansion = """
## Step-by-Step Enrollment Workflow

Let's trace a family's journey from inquiry to enrollment:

1. **Inquiry Phase (Week 1-2):** Family visits school or fills online form. School sends curriculum overview, fee structure, and interview slots. Family receives auto-confirmation SMS.

2. **Application Phase (Week 2-3):** Family submits formal application, uploads documents (previous school marks, birth certificate, medical records). School verifies documents digitally. Family receives status update every 48 hours.

3. **Interview Phase (Week 3-4):** Family attends interview. School conducts quick competency check (if needed). Interview notes stored in system.

4. **Offer Phase (Week 4):** If approved, school sends offer letter with admission terms. Family has 1 week to respond.

5. **Confirmation Phase (Week 5):** Family pays admission deposit via online portal. System auto-confirms and generates receipt. Enrollment is locked.

6. **Documentation Phase (Week 6):** Family submits remaining documents (uniforms, emergency contacts). School prepares student file and classroom roll.

7. **Pre-Admission Phase (Week 7-8):** School sends welcome kit, assigns roll number, shares timetable and class details.

---

## Digital vs. Physical Document Verification

Many schools still ask for originals (board marks, transfer certificates, medical records). Why?

- **Trust:** Originals appear more official
- **Legal:** Some documents require original signatures and seals
- **Compliance:** Some regulations mandate original documents

However, digital verification works for most documents:
- Previous school marks: Digital scan + email verification with old school
- Medical records: Doctor's letterhead + digital signature
- Birth certificate: Digital copy notarized or certified by school
- Vaccination records: Digital hospital certificate

*Recommendation:* Accept digital copies for initial verification. Collect originals only for official records (legal signatures on admission form, fee agreements).

---

## Reducing Enrollment Abandonment

Studies show 20-30% of applicants don't complete enrollment despite being interested. Why?

- **Slow communication:** Family waits 1 week for response, assumes they're rejected
- **Unclear next steps:** Family doesn't know what documents are needed or by when
- **Complicated process:** Multiple emails, forms, visits—family gives up
- **Price shock:** Family sees fee structure only late in process (should be clear at inquiry)

*How to Fix It:*
1. Respond to inquiries within 24 hours
2. Provide a clear timeline: "Application due by June 5 → Interview June 10 → Decision June 15"
3. Proactive follow-up: "We received your application. Next step: upload documents by June 3. Questions? Call us."
4. Share fee structure at first inquiry (so price-conscious families self-select out early, not mid-process)
5. Make the decision fast: "You'll hear from us by June 15."

"""
        elif article_num == 3:
            expansion = """
## Attendance Tracking Technologies

**Paper Register (Traditional)**
- **Pros:** No technology required, familiar to teachers
- **Cons:** Takes 5-10 minutes per class, prone to errors, no real-time data

**SMS-Based (Middle Ground)**
- **Pros:** Teachers text attendance after class, data flows to system
- **Cons:** Still manual, depends on teacher remembering

**Biometric (Fingerprint/Face Recognition)**
- **Pros:** Hard to manipulate, automated, fast (<1 minute per class)
- **Cons:** High upfront cost (Rs. 3-5 lakhs for infrastructure), needs maintenance

**RFID Cards (ID-Based)**
- **Pros:** Fast, non-intrusive (tap card at door), automatic
- **Cons:** Cards can be shared, initial cost (Rs. 2-3 lakhs), card replacement if lost

**Mobile App (Teacher Entry)**
- **Pros:** Flexible, works offline, syncs when online
- **Cons:** Depends on teacher compliance, smartphone required

*Recommendation for Indian Schools:* Start with a simple mobile app (teacher marks attendance in class) or RFID (tap-based at entry). Biometric is ideal but expensive; consider it when scaling.

---

## Analyzing Attendance Patterns

Raw attendance data is useless without analysis. What patterns matter?

1. **Chronic Absentees:** Students with >15% absence. Require intervention immediately.
2. **Day-of-Week Patterns:** Many absences on Mondays? Fridays? Indicates student engagement issues.
3. **Subject-Specific Absence:** High absence in math class but present in other classes? Suggests disengagement with that subject.
4. **Seasonal Patterns:** Absence spikes during exams, festivals, or harvest season? Understand the cause.
5. **Demographic Patterns:** Do girls have higher absence than boys? Do rural students have higher absence? Indicates equity issues.

*How to Act on Patterns:*
- Chronic absence → Parent meeting + intervention plan
- Day-of-week pattern → Counselor inquiry + engagement activities
- Subject-specific → Teacher support, peer tutoring, or subject change
- Seasonal → Adjust calendar or provide support during that season
- Demographic → Investigate systemic barriers and address

---

## Parent Communication via Attendance Dashboards

A parent-friendly attendance dashboard should show:
1. Child's attendance percentage (vs. class average, vs. school target)
2. Days absent this month (with reasons, if provided)
3. Trend graph: attendance over past 3 months
4. Alert: "Your child's absence is approaching the threshold. Take action."
5. Comparison: "Your child's attendance (92%) is above class average (88%)."

This shifts the narrative from punishment to partnership. Parents see real-time data and can support their child.

"""
        elif article_num == 4:
            expansion = """
## Timetable Optimization Techniques

**Manual (Spreadsheet-Based)**
- Pros: Full control, customizable
- Cons: Time-consuming, error-prone, hard to adjust

**Software-Based (Automated)**
- Pros: Algorithms optimize for constraints, easy to modify, simulations
- Cons: Setup time, may miss human judgment

*Popular Timetable Software:* Untis, TimeEdit, Timetable-Pro. Most Indian schools use spreadsheets or hire a consultant annually.

---

## Handling Timetable Conflicts

Conflicts happen: A teacher is double-booked, a room is over-allocated, a specialist isn't available at the right time.

**Prevent Conflicts:**
1. Clearly define constraints before starting (teacher availability, room capacity, resource limitations)
2. Build in buffer: Leave 5% of slots flexible for adjustments
3. Freeze preferences early: Teachers submit preferences by March; no changes later

**Resolve Conflicts:**
1. Prioritize core classes first (math, language, science)
2. Cluster specialist subjects (labs, arts) into dedicated slots
3. Allow teacher swaps: If Teacher A and Teacher B agree to swap their classes, allow it
4. Use substitute roster: If a teacher is absent, a substitute can cover (maintain flexibility)

---

## Co-Curricular Integration into Timetable

Co-curricular activities (sports, arts, clubs) are often afterthoughts. Better approach:

- **Block Time:** Allocate 2-3 hours weekly for co-curricular (e.g., Wednesday 2-4 PM is sports block)
- **Rotate Offerings:** Week 1: Cricket/Badminton | Week 2: Music/Drama | Week 3: Debate/Quiz | Week 4: Art/Craft
- **Mix with Academics:** Some activities are co-curricular academic (Science club, Math olympiad, Language club)
- **Track Participation:** Record which students attend which activities, generate badges/certificates

This ensures co-curricular isn't competing with academics; it's integrated.

"""
        elif article_num == 5:
            expansion = """
## Leave Approval Workflows

**Ideal Workflow:**
1. Parent logs into app → requests leave → specifies reason + duration
2. System checks: Are we in "leave-restricted" period (e.g., exams, 1 week before board exams)? If yes, warn parent but allow request.
3. Teacher receives notification → reviews → approves/rejects in 24 hours
4. System auto-updates attendance (if approved) or sends rejection with reason
5. Parent receives confirmation SMS

**What Makes a Good Leave Reason:**
- ✅ Genuine emergency (medical, family death, accident)
- ✅ Planned travel with advance notice (family trip, sibling wedding)
- ✅ Medical appointment (can't be scheduled after school hours)
- ❌ Vague ("personal work", "family emergency" without details)
- ❌ Last-minute without reason
- ❌ Exam day (or day before) without medical certificate

---

## Leave Limits by Type

**Sick Leave**
- Limit: 10 per year
- Requires: Certificate if >3 days
- Can't be used: Immediately before/after holidays

**Casual Leave**
- Limit: 5 per year
- No reason needed, but parent must request 48 hours in advance
- Can't be used: During exams or within 1 week before exams

**Emergency Leave**
- Limit: 2 per year
- No advance notice needed, but parent must provide reason
- Can be used anytime except during exams

**Medical Leave**
- No limit if supported by doctor's certificate
- Requires: Original medical certificate within 3 days of return

**Compassionate Leave**
- 3 days if family member death, 1 day if extended family
- Requires: Documentary proof (death certificate, cremation receipt)

---

## Preventing Exam Day Leave Abuse

The most common abuse: "My child needs emergency medical leave" on exam day or right after.

**Prevention:**
1. Announce exam dates 4 weeks in advance (no leaves allowed during this period)
2. Require medical certificate for leaves during exam period (no certificate = leave is rejected)
3. If student is ill during exam, they can take exam later during supplementary period (communicated to student/parent)
4. Log all exam-period leave requests separately for audit
5. If a student takes exam leave repeatedly (>2 times in a year), escalate to principal for investigation

"""
        elif article_num == 6:
            expansion = """
## Workflow Examples

**Example 1: Teacher Transfer Request**
- Teacher submits request: "Transfer to Math Department"
- HOD reviews: "Math needs this teacher. Approve."
- Principal reviews: "Budget allows. Approve."
- HR processes: "Transfer effective from June 1."
- Total time: 3 days (if all approvers respond promptly)

Without clear workflow: Teacher waits 3 weeks, submits reminder, escalates to principal. Chaotic.

---

**Example 2: Infrastructure Maintenance Request**
- Maintenance staff reports: "Classroom roof leaking."
- HOD inspects: "Confirmed. Budget required: Rs. 15,000."
- Principal approves: "Proceed. Use maintenance fund."
- Contractor engaged: "Fix by next week."
- Completion signed off: "Issue resolved."
- Total time: 1 week vs. 3-4 weeks in chaotic systems

---

## Escalation Protocols

What if an approval is delayed?

- **48 hours:** No response from approver → Auto-escalate to their supervisor
- **72 hours:** Still no response → Go to principal
- **Default Option:** For time-critical requests (exam schedule, emergency repairs), if approver is absent, system defaults to approval

This prevents bottlenecks. Approvers know they'll be escalated if they don't respond.

---

## Audit Trail Benefits

Every approval leaves a trace:
- Who approved, when, why
- Any changes to the request during approval
- Reasons for rejection (if rejected)

This enables:
1. **Compliance:** External auditors can verify all expenses were approved
2. **Learning:** Patterns emerge (e.g., 80% of requests from Dept X are approved; suggests bias or leniency)
3. **Accountability:** Approvers know their decisions are logged
4. **Dispute Resolution:** If someone claims they approved something, you have proof

"""
        elif article_num == 7:
            expansion = """
## Document Retention Policy

Here's a sample retention schedule for Indian schools:

| Document Type | Retention Period | Why |
|---|---|---|
| Student Admission Form | 7 years post-graduation | Legal requirement, board audit |
| Academic Transcripts | 7 years post-graduation | Student requests, higher education verification |
| Medical Records | 5 years post-graduation | Health insurance, emergency medical history |
| Attendance Records | 3 years | Regulatory requirement (usually) |
| Discipline Records | 3 years | Student dispute resolution, transfer school reference |
| Photographs (School Events) | 5 years | Alumni requests, school archive |
| Financial Records (Fees, Scholarships) | 7 years | Tax audit, financial verification |
| Staff Records (Salary, Performance) | 7 years | Tax, labor law, reference checks |

---

## Accessing Student Records

**Who Can Access What:**
- **Teachers:** Academic records (marks, attendance), behavioral notes
- **Counselor:** Medical records, special needs, family background
- **Accountant:** Fee payment records only
- **Principal:** Everything (administrative oversight)
- **Parents:** Their child's records (academic, attendance, medical)
- **Students:** Their own records (from age 15 onward)

**Access Logging:** Every time someone views sensitive records, it's logged (who, when, why). This creates accountability and privacy.

---

## Handling GDPR/Privacy Concerns

If your school has international students or expatriate families, you may need GDPR compliance.

**Key Points:**
1. **Consent:** Parents must explicitly consent to data collection (academic, medical, photos)
2. **Purpose Limitation:** Data collected for academics can't be used for marketing without permission
3. **Data Minimization:** Collect only what you need (don't collect caste, religion unless legally required)
4. **Data Portability:** Parents can request all data and move schools; you must provide in standard format
5. **Right to Deletion:** Parents can request deletion after child graduates (except where law requires retention)

*Practical Step:* Have parents sign a detailed "Consent & Privacy Notice" during admission acknowledging what data you collect and how it's used.

"""
        elif article_num == 8:
            expansion = """
## Case Study: Fee Structure Transparency

**School A (Opaque):** "Total fees: Rs. 1,50,000 per year." Parents ask, "Where does my money go?" No answer. Parents negotiate, some pay less, others pay full. Resentment builds. Late payers get constant reminders. Admin staff spend hours chasing fees.

**School B (Transparent):**
```
Annual Fees: Rs. 1,50,000
- Staff Salaries: Rs. 90,000 (60%)
- Infrastructure/Maintenance: Rs. 30,000 (20%)
- Academics (Books, Lab, Tech): Rs. 15,000 (10%)
- Student Activities/Co-Curricular: Rs. 10,000 (7%)
- Reserves (for growth, maintenance): Rs. 5,000 (3%)
```

Result: Parents understand. Late payers appreciate the need. Some parents with financial hardship request scholarships (not arbitrary discounts). School collects 95% fees on time vs. School A's 80%.

---

## Scholarship vs. Discount Philosophy

**Scholarship (Principled):**
- Criteria-based: Merit (top 10% scores), Economic (EWS families), Sports/Arts (talented)
- Transparent: All families know the criteria and can apply
- Fair: Same criteria applied to all students equally
- Predictable: Budget is allocated for scholarships, so school can sustain them

**Discount (Ad Hoc):**
- Negotiated: "Can you reduce to Rs. 1,40,000?" → Principal says yes to some, no to others
- Unfair: Similar families get different treatment
- Unsustainable: No budget allocated; school hemorrhages revenue
- Demoralizing: Students whose parents paid full price learn that negotiation gets discounts

*Recommendation:* Replace all discounts with transparent scholarships. Publish criteria. Invite applications. Be fair.

---

## Installment Plans for Affordability

Instead of a lump-sum, offer installments:
- Full Year: Rs. 1,50,000 (paid in June)
- Two Instalments: Rs. 76,000 (June) + Rs. 76,000 (December)
- Three Instalments: Rs. 50,000 (June) + Rs. 50,000 (Sep) + Rs. 50,000 (Dec)

This helps families without reducing fees. Many parents prefer three small payments over one large payment.

---

## Fee Increase Communication

Every year, fees increase (inflation, salary increases, new infrastructure). How to communicate?

**Good Communication:**
- January: Principal sends notice: "Fees will increase to Rs. 1,57,500 effective June (5% increase). Reason: Staff salary increase (3%) + new lab equipment (2%)."
- February: FAQ session for parents. Principal explains what changed and why.
- March: Reminder and final fee structure shared.

**Result:** Parents accept the increase because they understand it.

**Bad Communication:**
- June (first day of session): "New fees are Rs. 1,60,000 effective today." Parents shocked. Complaints ensue.

**Timing:** Announce by March for June increase, giving families 3 months to plan.

"""
        elif article_num == 9:
            expansion = """
## Balanced Allocation Algorithm

Here's how schools can allocate students objectively:

1. **Academic Balance:** Sort students by last year's marks. Allocate to sections in snake pattern (A gets top, B gets 2nd, C gets 3rd... then C gets next, B gets next, A gets next...). Result: all sections have similar average scores.

2. **Gender Balance:** Count boys/girls. Allocate to maintain roughly 50-50 ratio in each section.

3. **Sibling Grouping:** If siblings are both in same grade, place together (high priority).

4. **Learning Diversity:** If student data exists (learning style, special needs), distribute students with different profiles across sections. Don't cluster weak learners in one section.

5. **Teacher Assignment:** Assign strongest teachers to mixed-ability sections; let experienced teachers handle challenging groups.

**Result:** All sections perform similarly. No "weak class" perception.

---

## Addressing Post-Allocation Concerns

Parent: "My child is in Class A. His friend is in Class B. Can they be together?"

**Policy:** Allocation is final. No changes except for:
- Medical need (student has anxiety, needs specific support)
- Learning disability (student needs resource room access in a specific section's schedule)
- Genuine hardship (sibling was separated accidentally)

First 2 weeks of term are freeze period. After week 2, if student reports bullying or severe mismatch, escalate to counselor. Counselor makes final call on transfer.

---

## Class Identity & Belonging

Allocation feels punitive if sections feel ranked. Build positive identity:

- **Class Names:** Instead of A/B/C, use thematic names (Sparrows, Eagles, Tigers—no hierarchy)
- **Class Mentors:** Each section gets a dedicated mentor (not just subject teachers) who builds class bonds
- **Class Activities:** Class outings, team sports, creative projects where class competes/collaborates
- **Class Performance Celebration:** "Class Sparrows improved attendance 10%" (celebrate all, not just toppers)

Result: Students feel part of a team. Same section next year is an honor ("I'm a returning Sparrow leader helping new members"), not a stigma.

---

## Handling Mid-Year Transfers

Rare cases need transfers:
- Student reports bullying by specific classmates (move to different class)
- Student requests learning support (move to class with resource access)
- Teacher-student personality mismatch affecting learning (move to different teacher)

**Process:**
1. Counselor interviews student and parents to understand root cause
2. Counselor meets with teachers to assess if transfer is warranted
3. If approved, counselor prepares receiving section's teacher
4. Transfer happens with dignity ("New opportunity to join Class B") not punishment
5. Follow-up at week 2 and week 4 to ensure the transfer helped

"""
        elif article_num == 10:
            expansion = """
## Monthly Board Dashboard Template

**Sample Dashboard for Board Meeting (Monthly):**

**1. Enrollment Metrics**
- Total students: 425 (target: 450)
- New admissions this month: 12
- Withdrawals this month: 2
- Growth rate: +2.8% vs. last month

**2. Financial Health**
- Total fees collected: Rs. 65 lakhs (82% of billings)
- Outstanding fees: Rs. 14 lakhs (18% of billings)
- Expenses this month: Rs. 42 lakhs
- Operating margin: 35% (healthy)

**3. Academic Performance**
- Average attendance: 94% (target: 95%)
- Students below 75% attendance: 12 (needs intervention)
- Subjects with high failure rate: Math (8%), Science (5%)

**4. Compliance Status**
- UDISE+ data: Ready (submit by Sep 30)
- Safety audit: Passed (last year June)
- Annual inspection: Schedule for July
- RTE quota: Filled 5 of 5 seats

---

## Government Reporting: UDISE+ Explained

UDISE+ (Unified District Information System for Education Plus) is India's national school database. Every school reports annually.

**What Gets Reported:**
- School infrastructure (buildings, classrooms, toilets, water)
- Staff strength (teachers, support staff)
- Student enrollment (by class, gender, category)
- Learning outcomes (exam results)
- Safety & compliance (discipline, incidents)

**When:** Submission window is typically June-Sep. Check your state's timeline.

**How:** Online portal provided by state education department. Data is populated from school records.

**Consequence:** Data is public. Other schools, parents, media can see your school's stats. Use it to benchmark.

---

## Annual Inspection Preparation

Every year, government or board inspectors visit schools to verify:
- Infrastructure (classrooms, labs, playground)
- Staff qualifications (teachers should have proper degrees)
- Student records (enrollment, attendance, results)
- Curriculum implementation (are teachers following curriculum?)
- Safety (fire exits, first aid, emergency procedures)

**How to Prepare:**
1. **6 months before:** Self-audit using official inspection checklist
2. **3 months before:** Fix compliance gaps (hire certified teachers, repair infrastructure, update records)
3. **1 month before:** Organize all documents (staff credentials, student records, financial records)
4. **1 week before:** Mock inspection by school leader or external consultant
5. **During inspection:** Be transparent. Inspectors appreciate honesty more than perfection.

---

## Using Data for Continuous Improvement

Don't just report data; act on it.

**Example:** UDISE+ data shows only 60% of Class 5 students passed in Math. What's wrong?

1. **Diagnose:** Are they missing prerequisites (from Class 4)? Is the teacher qualified? Is curriculum too hard?
2. **Intervene:** Provide remedial class for weak students. Upskill teacher via training. Adjust curriculum pace.
3. **Monitor:** Reassess in 2 months. Has pass rate improved?
4. **Report:** Next year's UDISE+ should show improvement. If not, escalate to principal.

This turns data into action.

"""
    else:
        # Category 3 Academic expansions
        if article_num == 1:
            expansion = """
## Scope and Sequence Template

Here's what a scope-sequence document looks like:

**Grade 6 Science (Botany Unit)**
- **Weeks 1-2:** Plant Structure (root, stem, leaf, flower)
  - Learning Outcomes: Identify plant parts. Explain function of each part.
  - Activities: Label diagrams, dissect flowers, draw structures
  - Assessment: Diagram test, oral Q&A

- **Weeks 3-4:** Photosynthesis
  - Learning Outcomes: Understand how plants make food. Explain role of chlorophyll.
  - Prerequisites: Plant structure, light concepts
  - Activities: Experiment (light/no-light plant), video explanation, group discussion
  - Assessment: Quiz, concept map

- **Weeks 5-6:** Plant Reproduction
  - Learning Outcomes: Distinguish sexual vs. asexual reproduction.
  - Activities: Observe seeds, sprouting experiments, case studies (potato, bamboo)
  - Assessment: Exam question, project (grow a plant)

**Mapping to Board (CBSE Class 6):**
- This unit covers Board Syllabus Chapter 7 (Nutrition in Plants) + Chapter 8 (Respiration).
- NCERT textbook: Pages 86-101. School adds diagrams from resource site X.

---

## Curriculum Customization for School Context

A school in Kerala can't use the exact same curriculum as a school in Delhi. Customize:

1. **Examples:** Use local context. Delhi school: "Water scarcity in NCR region" vs. Kerala school: "Monsoon floods and water management"

2. **Pace:** Rural school with weaker previous background: slow pace with more practice. City school with stronger base: faster pace with deeper exploration.

3. **Resources:** School with lab: experiments. School without: video-based learning and virtual labs.

4. **Languages:** Some schools teach science in English; others in regional language. Adjust vocabulary accordingly.

5. **Values:** Some schools emphasize sustainability; others emphasize industry readiness. Weave that into curriculum.

---

## Scaffolding and Prerequisite Mapping

When teaching fractions in Grade 4:
- **Prerequisite:** Students should know what division means (Grade 3)
- **Scaffold:** Start with visual fractions (pizza slices, pie charts) → then numbers → then operations
- **Progression:** Simple fractions (1/2, 1/4) → mixed fractions → fractions with different denominators → operations

If you skip scaffolding, students don't understand. If you go too slow, they get bored. Good curriculum maps out the right pace.

---

## Aligned Assessments

Assessment should match learning outcomes:

**Learning Outcome:** "Student can solve multi-step word problems involving fractions"

**Good Assessment:** "A pizza is divided into 8 slices. Ali eats 1/4. Bob eats 1/8. How many slices are left?"
(Tests comprehension + calculation + application)

**Poor Assessment:** "What is 3/4 + 1/8?"
(Tests only calculation, not problem-solving)

Curriculum should specify assessment methods that align with outcomes, not just content.

"""
        elif article_num == 2:
            expansion = """
## Lesson Plan Template

Here's a complete lesson plan for one 45-minute class:

**Topic:** Photosynthesis | **Grade:** 6 | **Date:** March 15, 2026

**Learning Objective:** Students will understand that plants make their own food using sunlight (by end of lesson)

**Prior Knowledge Assumed:** Plant structures, concept of energy, light properties

**Assessment:**
- Formative: Observation during activity, class participation
- Summative: Quiz at end of week

**Materials Needed:** Green leaves, sealed bag, transparent container, sunlight, water, glucose solution

**Timeline:**

| Time | Activity | Teacher Role | Student Role | Why |
|---|---|---|---|---|
| 0-5 min | **Hook:** Show a wilted plant. "How did this happen? How do plants stay alive without eating food?" | Ask questions, generate curiosity | Discuss prior knowledge | Engage interest |
| 5-10 min | **Direct Teach:** Explain photosynthesis using labeled diagram on board | Explain clearly, check understanding | Listen, ask clarifying questions | Provide foundational knowledge |
| 10-25 min | **Activity:** Divide class into 3 groups. Group A: seal a plant in dark bag, Group B: expose plant to sunlight, Group C: seal and expose. Record observations over 1 week. | Facilitate group work, ask probing questions | Conduct experiment, predict outcomes | Hands-on learning |
| 25-35 min | **Closure:** Class shares observations. Teacher guides toward understanding | Guide synthesis of findings | Present findings, draw conclusions | Consolidate learning |
| 35-45 min | **Practice:** Students label a photosynthesis diagram and answer 3 conceptual questions | Clarify confusion, provide feedback | Answer questions individually | Reinforce learning |

**Homework:** Read textbook page 90-92. Sketch the photosynthesis process in your own words.

**Differentiation:**
- Fast learners: "Draw a flowchart of photosynthesis from raw materials to energy."
- Slow learners: Complete partially-filled diagram of photosynthesis.

---

## Activating Prior Knowledge

Never assume students remember last lesson. Activate prior knowledge:

- **Lesson on Respiration:** Start with: "Recall: What is photosynthesis? Turn to partner and explain in 1 minute."
- **Lesson on Electricity:** Start with: "Think about your phone charging. How does electricity flow? Discuss."

This primes the brain to connect old knowledge with new knowledge.

---

## Checking for Understanding Mid-Lesson

Don't just teach and test at the end. Check throughout:

- Minute 10: Ask 3 random students: "What does chlorophyll do?" (Gauge understanding)
- Minute 20: Quick poll: "Raise hand if you think plants breathe at night." (Identify misconceptions)
- Minute 30: "Turn to partner and explain photosynthesis in your own words." (Peer check)

If 20% of class doesn't understand, re-teach. If 80% understands, move on.

---

## Homework Purpose

Homework should reinforce, not repeat:

- ❌ Homework: "Do 20 math problems exactly like we did in class"
- ✅ Homework: "Do 10 problems similar to class examples, then 3 challenge problems requiring new thinking"

Homework prepares next lesson, not just reviews today's lesson.

"""
        elif article_num == 3:
            expansion = """
## Assessment Rubric Example

**Project: Research and Present a Famous Scientist (Grade 6)**

| Criteria | Excellent (4) | Good (3) | Satisfactory (2) | Below Average (1) |
|---|---|---|---|---|
| **Research Quality** | 5+ reliable sources cited. Information is accurate and recent. | 4 sources, mostly reliable. 1-2 minor inaccuracies. | 3 sources, some reliability issues. Several inaccuracies. | <2 sources, unreliable (e.g., Wikipedia without verification). Major inaccuracies. |
| **Understanding** | Student explains scientist's contribution clearly. Can answer follow-up questions. Connects to real-world. | Explains contribution adequately. Answers most follow-up questions. | Basic explanation. Struggles with follow-up questions. | Minimal understanding. Can't explain contribution. |
| **Presentation** | Well-organized (intro, body, conclusion). Engages audience. Clear voice, good eye contact. Uses visuals effectively. | Organized. Some engagement. Mostly clear presentation. Visuals present. | Somewhat organized. Little engagement. Unclear in places. Minimal visuals. | Disorganized. Doesn't engage audience. Hard to follow. No visuals. |
| **Creativity** | Unique perspective or angle. Memorable presentation. | Interesting approach. Adequate presentation. | Standard approach. Adequate presentation. | Minimal creativity. Boring presentation. |

**Scoring:** Add points (4+3+4+3=14/16). Convert to percentage or grade.

**Feedback:** "You research was excellent and your presentation was engaging. Next time, include one real-world application of this scientist's work. Great job!"

---

## Formative vs. Summative Assessment

**Formative Assessment (Learning Assessment):**
- Ongoing, throughout unit
- Low-stakes (not graded)
- Provides feedback to improve
- Examples: Quizzes, class participation, exit tickets, observations
- Purpose: Teacher adjusts teaching; student adjusts learning

**Summative Assessment (Grading Assessment):**
- End-of-unit
- High-stakes (counts toward grade)
- Measures final learning
- Examples: Unit test, project, exam
- Purpose: Evaluate what student learned

**Best Practice:** 70% formative (practice, feedback) + 30% summative (graded assessment).

---

## Creating Assessment Questions at Different Difficulty Levels

**Bloom's Taxonomy (Easiest to Hardest):**

1. **Remember:** "What are the three branches of government?"
   - Lower-level. Most students pass.

2. **Understand:** "Explain why the three branches are separate."
   - Mid-level. Most students pass.

3. **Apply:** "If the judiciary's power was removed, what would happen to our country?"
   - Higher-level. 60% pass.

4. **Analyze:** "Compare the Indian judicial system with the US judicial system. What differences do you see?"
   - Challenging. 40% pass.

5. **Evaluate:** "Which country's judicial system is more just? Justify your answer."
   - Very hard. 20% pass.

A balanced assessment has 40% Remember, 30% Understand, 20% Apply, 10% Analyze/Evaluate.

---

## Grading Philosophy

**Standards-Based Grading:** "Can the student do X?"
- Grade reflects mastery of specific skill
- Multiple attempts to pass (reassessment allowed)
- Clear criteria (rubric)
- Example: "Mastery of fractions: Yes/No"

**Points-Based Grading:** "How many points did the student earn?"
- Grade reflects total accumulated points
- One shot (reassessment usually not allowed)
- Subject to teacher bias
- Example: "Math: 78/100"

**Recommendation:** Use standards-based for K-8 (clearer learning). Use points-based for High School if needed for ranking/boards.

"""
        elif article_num == 4:
            expansion = """
## Early Warning Systems

Identify at-risk students early:

**Indicators (Month 1):**
- Failed first assessment (formative test)
- Incomplete homework submissions
- Lack of participation in class
- Behavioral issues (distraction, disruption)

**Indicators (Month 2):**
- Multiple failed assessments
- Withdrawal from peers
- Missing school (emerging absenteeism)
- Negative attitude ("I can't do this")

**Indicators (Month 3):**
- Failed unit test
- Failing in 2+ subjects
- Chronic absenteeism
- Teachers reporting hopelessness

**Action Timeline:**
- **Month 1 indicators:** Parent meeting, peer tutoring offer
- **Month 2 indicators:** Counselor support, potential learning disability screening
- **Month 3 indicators:** Remedial class, special educator, possible summer school

---

## Diagnostic Assessment

Before intervention, diagnose the root cause:

**Questions to Ask:**

*Is it a prerequisite gap?*
- "Can you solve 3 + 4?" (If no, foundation is weak)
- Intervention: Teach prerequisites before current material

*Is it a learning disability?*
- "Does this student struggle only in math or in all subjects?"
- "Are there other indicators (slow reading, speech issues)?"
- Intervention: Refer for formal evaluation; provide accommodations

*Is it motivation?*
- "Does student care about failing?" (Ask directly)
- "What are they interested in? Can we connect to that?"
- Intervention: Counselor support, choice in learning activities

*Is it family/personal crisis?*
- "Is everything okay at home?" (Ask sensitively)
- "Are there financial, health, or family issues?"
- Intervention: Social worker support, potential fee waiver, flexible pace

Diagnosis guides intervention. One-size-fits-all tutoring doesn't work if root cause is motivation or family crisis.

---

## Intervention Program Options

**In-School Options:**
1. **Reteaching:** Teacher re-teaches the concept using different methods (visual, kinesthetic, etc.)
2. **Small group instruction:** 4-5 students with same gaps, separate from main class, 30 min 3x/week
3. **Peer tutoring:** Stronger student tutors weaker student. Benefits both.
4. **Technology-based:** Adaptive software (Khan Academy, Byju's) that adjusts to student level

**Out-of-School Options:**
1. **Private tutoring:** Parent-hired tutor (not school's role, but school can recommend)
2. **Summer school:** Intensive remediation over summer break
3. **After-school program:** School-run program (1 hour after school, 3-4 days/week)

**Which to Choose:**
- Mild gaps (80% mastery): In-school reteaching works
- Moderate gaps (50-80%): Small group + peer tutoring
- Severe gaps (<50%): Intensive intervention + possible counseling

---

## Tracking Intervention Success

Don't assume intervention worked. Measure:

1. **Short-term:** After 4 weeks of intervention, reassess. Has the student improved?
2. **Mid-term:** After 8 weeks, is the gap narrowing?
3. **Long-term:** By next unit test, is the student at grade level?

**Reassessment Tools:**
- Same assessment given again (so you can compare)
- Parallel form (similar questions, different numbers)
- Observation (is student more confident, more participatory?)

**If No Improvement:** Consider:
- Is intervention too slow/too fast?
- Is root cause different than assumed?
- Does student need different intervention?
- Is something else interfering (family crisis, attendance, motivation)?

Regular progress monitoring prevents student from getting lost.

"""
        elif article_num == 5:
            expansion = """
## Subject-Specific Pedagogies

**Mathematics Teaching:**
- **Problem-Based:** Students solve real-world problems, discover math concepts
- **Spiral Curriculum:** Revisit concepts in increasing depth (fractions in Grade 3, 4, 5, 6...)
- **Manipulatives:** Use blocks, beads, diagrams so abstract concepts become concrete
- **Productive Struggle:** Let students struggle with a problem before revealing the shortcut (builds deeper understanding)

**Science Teaching:**
- **Inquiry-Based:** Students ask questions, design experiments, discover answers (not lecture)
- **Hands-On Experiments:** Concepts stick better when experienced, not just read
- **Field Trips:** Visit labs, museums, nature sites so learning isn't just classroom-bound
- **Connection to Life:** "Why do we learn photosynthesis? Because crops need it to feed us."

**Language Teaching (English):**
- **Immersion:** Use English in all classes (not just English period)
- **Read-Aloud:** Teacher reads engaging books; students listen and discuss
- **Writing for Purpose:** Write emails, letters, blogs (not just grammar exercises)
- **Speaking Opportunities:** Presentations, debates, conversations (not silent grammar drills)

**Social Studies Teaching:**
- **Debate & Discussion:** Encourage different perspectives on historical events
- **Local Connection:** Study local history, local government, local economy
- **Role Play:** Act out historical events or government systems
- **Primary Sources:** Read actual documents from the era (letters, newspapers) not just textbook summaries

**Art & Music Teaching:**
- **Creation:** Students make art, make music (not just appreciation)
- **Cross-Subject Links:** Music in math (rhythm, patterns), art in science (nature observation, biological illustration)
- **Cultural Exploration:** Study diverse art forms (Indian classical music, aboriginal art)

---

## Teacher Professional Development

Schools should invest in teacher upskilling:

**Topics:**
- Subject-specific content update (stay current)
- Modern pedagogy (active learning, game-based learning)
- Technology integration (interactive boards, apps)
- Classroom management (handling difficult behavior)
- Assessment methods (beyond traditional tests)

**Formats:**
- Monthly in-house training (1 hour)
- Annual conference (2-3 days)
- Online course (self-paced)
- Learning circles (teachers share best practices)

**Budget:** Allocate 2-3% of revenue for teacher training. Small investment, big returns.

---

## Creating a Community of Practice

Teachers learn from each other. Create structures for collaboration:

1. **Subject Department Meetings:** Math teachers meet monthly to discuss curriculum, assessments, student challenges
2. **Classroom Visits:** Teachers observe each other's classes and provide feedback
3. **Lesson Sharing:** Teachers share successful lesson plans (saves prep time, spreads best practices)
4. **Action Research:** Teacher identifies a challenge ("How can I improve participation?"), tries solutions, shares results
5. **Mentoring:** Experienced teachers mentor new teachers

Result: School culture of continuous improvement. Teachers feel supported and inspired.

"""
        elif article_num == 6:
            expansion = """
## Integrated Unit Example: Water (Grade 4)

**Unit Theme:** Where does water come from? Where does it go? Why is it important?

**Subjects Connected:**
- **Science:** Water cycle, water properties, ecosystems, weather
- **Math:** Measuring volume, capacity, data collection (rainfall)
- **Language:** Reading water-related stories, writing about conservation
- **Social Studies:** Water distribution globally, access disparities, culture (rivers in India)
- **Art:** Painting water, sculpting water features
- **PE/Sports:** Swimming, water safety

**Activities:**
1. **Water Cycle Experiment:** Seal water in a bag, observe condensation, relate to real cycle
2. **Rainwater Measurement:** Collect rain weekly, chart rainfall trends, learn statistics
3. **Water Safety Workshop:** Learn to swim, CPR, awareness
4. **Guest Speaker:** Environmental scientist talks about water scarcity in India
5. **Art Project:** Create a water-themed mural
6. **Writing:** "Where I live, water comes from [river/borewell/pipeline]. We should conserve water because..."
7. **Field Trip:** Visit a water treatment plant

**Culmination:** Student presentation: "Why is water important? How can I conserve water?" (combines all learning)

**Duration:** 4-6 weeks

**Benefits:**
- Students see connections between subjects (not silos)
- Learning is meaningful (why am I learning this?)
- Multiple intelligence levels addressed (kinesthetic learners enjoy experiments; linguistic learners enjoy writing)
- Real-world relevance (water conservation is urgent today)

---

## Project-Based Learning (PBL) Structure

Good PBL follows this structure:

1. **Essential Question:** A thought-provoking question that drives the unit
   - Example: "How can we reduce plastic waste in our school?"
   - Not answerable in 1 minute; requires investigation

2. **Research Phase:** Students investigate, gather data, read, interview
   - Example: "How much plastic does our school use weekly? What alternatives exist?"

3. **Design Phase:** Students propose a solution
   - Example: "Design a composting system for the school"

4. **Implementation/Creation:** Students make the solution (or prototype)
   - Example: Actual compost bin, awareness campaign

5. **Presentation:** Students present findings and solution to authentic audience
   - Example: Present to school principal and parent committee

6. **Reflection:** Students reflect on learning and process
   - Example: "What challenges did we face? What would we do differently?"

**Authentic Audience:** Presenting to real audience (not just teacher) increases engagement and rigor.

---

## Co-Curricular Awards and Recognition

Not all students excel academically. Recognize diverse talents:

- **Academics:** Topper in each subject, highest improvement
- **Sports:** Best player (team), most improved, best sportsmanship
- **Arts:** Best performer, best artist, best musician
- **Leadership:** Best class representative, best prefect, most helpful
- **Service:** Most community service hours, best environmental advocate
- **Attitude:** Most improved behavior, most thoughtful, most encouraging peer

**Benefit:** Every student gets recognized for something, building confidence and sense of belonging.

"""
        elif article_num == 7:
            expansion = """
## Project Assessment Rubric

**Project: Design a Sustainable Classroom (Grade 7)**

| Criteria | Excellent | Good | Satisfactory | Below Average |
|---|---|---|---|---|
| **Problem Understanding** | Clearly identifies 2+ sustainability issues in typical classroom. Understands impact. | Identifies 1-2 issues. Understands impact. | Identifies basic issues. Limited understanding of impact. | Vague problem identification. |
| **Research** | 5+ credible sources. Cites recent data. Understands what exists. | 3-4 sources. Some data. Knows some options. | 2-3 sources. Basic information. Limited options explored. | <2 sources. Incomplete information. |
| **Design Creativity** | Novel solution. Practical and feasible. Well-reasoned trade-offs. | Good solution. Mostly practical. Some reasoning. | Basic solution. Partially practical. Limited reasoning. | Impractical or incomplete solution. |
| **Collaboration** | All group members contributed equally. Clear role division. Resolved conflicts constructively. | Most members contributed. Some role division. Managed conflicts. | Unequal contribution. Unclear roles. Some conflict. | One member dominated. Conflict unresolved. |
| **Presentation** | Clear, engaging, well-organized. Visuals support content. Handles Q&A well. | Organized, mostly clear. Adequate visuals. Handles some Q&A. | Somewhat organized. Minimal visuals. Struggles with Q&A. | Disorganized. No visuals. Doesn't handle Q&A. |

---

## Peer Review Process

Structure peer feedback so it's constructive:

1. **Glow:** "What's something you did really well?"
2. **Grow:** "One thing you could improve is..."
3. **Question:** "I wonder if you considered...?"

Example:
- Peer 1: "I loved your poster design (Glow). The text could be bigger so it's readable from far away (Grow). Did you consider adding a photo of actual composting bin (Question)?"

This format: affirms + suggests + prompts thinking.

---

## Group Grades vs. Individual Grades

Problem: One student does all work; group gets same grade. Unfair.

Solution:
- **Group Grade (40%):** Quality of the project itself
- **Individual Grade (60%):** Based on:
  - Peer evaluation: "How much did each member contribute?" (1-5 scale)
  - Individual task: Each student completes a component alone
  - Reflection: Student writes what they did and learned

Example: Project gets 90/100 (group grade). But Student A gets 95 (high peer evaluation), Student B gets 75 (low peer evaluation, contributed less).

---

## Celebrating Project Outcomes

Don't just grade and move on. Celebrate:

1. **Gallery Walk:** Display all projects in school hallway. Students walk around, view each other's work.
2. **Public Presentation:** Invite parents to student presentations.
3. **Real-World Use:** If project is actionable (poster, compost bin, website), actually implement it.
4. **Student Feedback:** Ask students: "What did you learn from others' projects?"

This motivates students and validates their effort.

"""
        elif article_num == 8:
            expansion = """
## Gifted Education Framework

**Identification:**
- Standardized tests (IQ, achievement)
- Teacher nomination (who are the bright students?)
- Parent request (family believes child is gifted)
- Portfolio (collection of work showing advanced thinking)

**Typical Profile:**
- Quick learner (understands in 1 explanation vs. peers needing 5)
- Curious (asks "Why?" constantly)
- Creative (unusual solutions, novel ideas)
- Perfectionist (gets upset by errors)
- Advanced vocabulary for age
- May be socially awkward or perfectionist to point of paralysis

**Note:** Gifted students aren't always the top grades. Some gifted students are underachievers because school isn't challenging.

---

## Differentiation for Gifted Learners

**Acceleration:**
- Move student to advanced material (e.g., Grade 6 math student does Grade 7 math)
- Faster pace (cover same curriculum in less time, then explore advanced topics)
- Early access to electives (Grade 4 student takes Grade 6 course)

**Enrichment:**
- Depth instead of acceleration (Grade 6 math: instead of speeding to Grade 7, do more complex, open-ended problems)
- Project opportunities (design, research, creation)
- Mentorship (pair with high school/college student or professional in field)
- Clubs (Robotics club, Debate club, Research club)

**Counseling:**
- Gifted students may struggle with perfectionism, social anxiety, or feeling different
- Counselor helps: "Your intelligence is a gift, but it's okay to make mistakes."

---

## Preventing Gifted Burnout

Gifted students are at risk of overcommitment and burnout:
- Parents push: "You should take 5 activities!"
- Student agrees to everything to impress
- Result: Overwhelmed, exhausted, resentful

**Prevention:**
- Limit involvement: "Choose 1-2 activities; excel at those, not 5 mediocrely"
- Emphasize rest: "Downtime is important. Rest isn't laziness."
- Model balance: Teachers/parents demonstrate work-life balance
- Permit "safe failure": "You don't have to excel at everything"

---

## Gifted Students in Mixed-Ability Classes

If your school doesn't have separate gifted programs, how to support in regular classes?

1. **Anchor Tasks:** Gifted student finishes core work early. Anchor task is waiting (extension problem, research project, mentor role)
2. **Choice Menus:** "After completing core task, choose from these 5 extension options"
3. **Independent Projects:** Gifted student pursues deep interest independently (teacher provides guidance)
4. **Peer Teaching:** Gifted student helps struggling classmate (benefits both)

This keeps gifted student challenged without removing from class.

"""
        elif article_num == 9:
            expansion = """
## Exam Readiness Timeline

**January (Early):**
- Start course reviews
- Identify weak topics (via formative assessments)
- Provide extra classes for weak areas
- No pressure; focus on learning

**February (Mid-Year):**
- First mock exam (simulate board format)
- Review performance; identify areas to strengthen
- Increase practice problem solving
- Teach exam techniques (time management, question prioritization)

**March (Late):**
- Second mock exam
- Focus on weak areas from first mock
- Practice previous years' board papers
- Begin timed practice tests

**April-May (Final):**
- Intensive revision
- Frequent practice tests (weekly or bi-weekly)
- Last mock exam (week before actual exam)
- Manage stress; ensure adequate sleep

---

## Exam Techniques Worth Teaching

**Time Management:**
- Skim all questions first (2-3 min)
- Allocate time: "I have 3 hours. 50 questions = 3-4 min per question."
- Tackle easy questions first (build confidence)
- Leave hard questions for end

**Reading Comprehension:**
- Read question twice before answering
- Underline keywords
- Check: "Did I answer what was asked, or something else?"

**Multiple Choice Strategy:**
- Eliminate obviously wrong options first
- Re-read to confirm choice
- Don't overthink; go with gut after first read

**Essay Questions:**
- Outline before writing (3-5 min outlining saves 10 min writing time)
- Write clearly (examiner can't give marks if they can't read)
- Answer all parts (if question has 3 parts, ensure all 3 are answered)

---

## Managing Exam Stress

**Physical:** Ensure sleep, nutrition, water. 8 hours of sleep beats 1 extra study hour.

**Mental:** Meditation, deep breathing, positive self-talk.
- "I've prepared. I can handle this."
- "Even if I don't know answer, I know how to eliminate options."

**Social:** Maintain contact with friends. Don't isolate. Study groups (not panic groups) help.

**Parental:** Parents should not say "Life depends on this exam." Instead: "We love you regardless of results. Do your best."

---

## Post-Exam Support

Exam is over. Student feels relief or disappointment (or both). What now?

**Immediate (Days after exam):**
- Give students a break (no studies for 1-2 days)
- Celebrate effort: "You worked hard. That's what matters."
- Don't discuss results obsessively

**Before Results (2-4 weeks later):**
- If some papers went poorly, discuss coping: "A bad paper doesn't erase good papers."
- Plan next steps: "If score is below target, what will you do differently next year?"

**After Results:**
- Celebrate passes. Support failures with dignity.
- Analyze (if low marks): "What was difficult? Math concepts? Time management? Exam anxiety?" → Plan improvement.
- Move on. One exam is not a life verdict.

"""

    # Find insertion point and insert expansion
    expanded_content = content[:insertion_point] + expansion + "\n" + content[insertion_point:]

    # Write back
    with open(filepath, 'w', encoding='utf-8') as f:
        f.write(expanded_content)

    new_words = len(expanded_content.split())
    return new_words


def main():
    base_articles_dir = r"C:\Users\yashv\Desktop\Yashveer Singh\My-Apps\Nexli\articles"
    cat1_dir = os.path.join(base_articles_dir, "01-school-admin")
    cat3_dir = os.path.join(base_articles_dir, "03-academics")

    print("=" * 70)
    print("ENHANCING ARTICLES TO 1,200-1,800 WORDS")
    print("=" * 70)

    cat1_articles = sorted([f for f in os.listdir(cat1_dir) if f.endswith('.md')])
    cat3_articles = sorted([f for f in os.listdir(cat3_dir) if f.endswith('.md')])

    for filename in cat1_articles:
        filepath = os.path.join(cat1_dir, filename)
        new_words = enhance_article(filepath)
        if new_words:
            print(f"[ENHANCED] {filename[:45]:45} -> {new_words} words")

    for filename in cat3_articles:
        filepath = os.path.join(cat3_dir, filename)
        new_words = enhance_article(filepath)
        if new_words:
            print(f"[ENHANCED] {filename[:45]:45} -> {new_words} words")

    print("=" * 70)
    print("Enhancement complete!")
    print("=" * 70)


if __name__ == "__main__":
    main()
