---
title: "List of Candidates (LOC) Submission: Step-by-Step Guide for CBSE Schools"
slug: "08-cbse-list-of-candidates-loc-submission"
meta_description: "Master CBSE List of Candidates (LOC) submission process. Learn eligibility criteria, data validation, error prevention, and how modern ERPs automate LOC generation and CBSE reconciliation."
category: "School Type Specific Solutions"
primary_keyword: "CBSE List of Candidates LOC submission"
secondary_keywords:
  - "LOC submission CBSE Class 10 12"
  - "LOC eligibility criteria attendance"
  - "LOC data validation CBSE"
  - "LOC submission errors prevention"
  - "LOC hall ticket generation"
intent: "educational"
author: "Yashveer Labs"
date: "2026-06-19"
branding_block_founder: 7
branding_block_company: 7
branding_block_nexli: 7
---
## What is LOC and Why It Matters

The List of Candidates (LOC) is CBSE's mandatory submission for schools before Classes 10 and 12 board examinations. LOC gates exam hall ticket generation, result processing, and certificate issuance. Without LOC, board exams cannot happen.

LOC submission sounds simple: extract a list of students eligible for the exam and send it to CBSE. In practice, it's a high-stakes process prone to errors. One formatting mistake, a duplicate roll number, a missing field, or wrong character encoding invalidates the entire submission. Schools discover errors only after CBSE rejects the LOC, forcing emergency corrections with exam day approaching.

A school with 500 students submitting LOC manually via CSV typically takes 5–7 days and introduces 3–5 errors per submission. A school using an ERP that automates LOC generation and validation takes 2–3 hours and introduces zero errors.

---

## The LOC Submission Process: What Schools Must Do

### Step 1: Determine Eligible Students

Not every student enrolled in Class 10 or 12 is eligible for the board exam. CBSE and schools impose strict eligibility criteria:

**Attendance Requirement:**
- Minimum 75% attendance in the academic year
- Medical or other authorized absences may be exempt (school verifies with CBSE)
- Absences due to suspension or expulsion make a student ineligible

**Internal Assessment Submission:**
- All internal assessment marks must be submitted and moderated (20–30% of final marks depending on the subject and class)
- Missing internal marks in even one subject makes a student ineligible
- Internal marks must be reconciled with CBSE's internal assessment specifications

**Academic Requirements:**
- All subjects must be completed (no dropped subjects unless formally approved)
- No academic or conduct suspensions during the year
- Exam fee must be paid in full

**Administrative Requirements:**
- Student must have a valid Aadhaar number (CBSE requires this since 2019)
- No pending holds from other departments (library, hostel, accounts)
- No duplicate roll numbers or conflicting records in the enrollment system

Manually verifying these criteria for 500 students takes weeks. An ERP with real-time attendance, marks, and fee tracking can generate an eligibility report in minutes.

### Step 2: Extract and Format Data

CBSE specifies exact LOC format. The CSV file must include:

- Roll number (school-assigned, must be unique)
- Aadhaar number (12 digits, cannot be blank)
- Student name (surname, given name, middle name, in that specific order)
- Date of birth (DD-MM-YYYY format)
- Gender (M/F, specific format)
- Subject choices (exactly as per CBSE's subject codes)
- Medium of exam (English/Hindi/Regional language, specific format)
- Category (General/OBC/SC/ST, specific format)
- PWD status (if applicable)

One field out of place, wrong format, or missing character and CBSE's automated validation rejects the entire file. Schools handling this manually via CSV export and manual formatting introduce errors regularly.

### Step 3: Validate and Error-Check

Before submission, schools must validate:

- No duplicate roll numbers
- No duplicate Aadhaar numbers (unless formally dual-enrolled)
- All Aadhaar numbers are exactly 12 digits
- No special characters in student names
- Subject codes match CBSE's exact coding
- All mandatory fields are populated
- Character encoding is UTF-8 (CBSE's requirement)
- File size is within CBSE's limits

Manual validation is tedious and error-prone. Schools typically use online validators (CBSE provides one) and catch errors after submission, forcing resubmission.

### Step 4: Submit to CBSE

CBSE LOC portal opens on a fixed date (typically 3–4 months before exams). Schools log in, upload the CSV file, and CBSE's system validates automatically. If validation passes, CBSE confirms submission. If validation fails, schools see error codes but not always clear explanations.

Common errors discovered at submission:
- Duplicate Aadhaar numbers (often data-entry errors or students appearing in multiple records)
- Missing Aadhaar numbers (students without Aadhaar ID cards enrolled anyway)
- Character encoding errors (names with diacritics or regional characters corrupted in export)
- Subject code mismatches (school's internal subject code different from CBSE's code)

### Step 5: Reconcile with Hall Tickets

After LOC is accepted, CBSE generates hall tickets. Schools must reconcile: every eligible student should have a hall ticket; every hall ticket should correspond to an enrolled student. If reconciliation shows discrepancies, schools contact CBSE, which delays hall ticket issuance.

### Step 6: Final Verification Before Exams

One week before exams, schools verify that all hall tickets are printed and distributed. If a student's hall ticket is missing, schools contact CBSE for an emergency correction. This last-minute scramble is stressful and error-prone.

---

## Why Manual LOC Submission Fails

### Time Bottleneck

A coordinator manually exports student data from various systems (enrollment, attendance, marks, fees), consolidates in Excel, manually checks for errors, formats according to CBSE specs, validates using an online tool, discovers errors, corrects, and resubmits. For a 500-student school, this takes 5–7 days minimum. For larger schools (1,000+ students), it can take 10+ days.

### Data Integrity Risk

Data lives in multiple systems: attendance in an attendance sheet, marks in an assessment system, fees in an accounting system. Pulling data from disparate sources and manually consolidating introduces mismatches. A student's name might be spelled differently in the enrollment system vs. the attendance system. Aadhaar numbers might be incomplete or incorrectly entered.

### Error Detection After Submission

Errors are often caught only when CBSE rejects the LOC. At that point, schools are under time pressure. Corrections must be made quickly, but with stress, additional errors are introduced. Schools sometimes omit eligible students in the corrected LOC while trying to remove ineligible ones.

### Regulatory Compliance Gap

If an eligible student is accidentally excluded from LOC and cannot sit the board exam, the school faces serious consequences: parent complaints, potential legal action, and reputational damage. Conversely, if an ineligible student is included and CBSE later disqualifies them after exams, results are voided.

### Knowledge Silos

If the staff member who knows LOC submission leaves (the accountant, the data coordinator), the school has no documented process. A new person must learn from scratch, introducing delays and errors.

---

## Consequences of LOC Errors

**Exam Conduct Delay:** Hall ticket generation is delayed, pushing exam dates back. Parents and students face uncertainty.

**Student Stress:** Students without hall tickets one week before exams experience severe stress. Even if corrected, the incident damages parent confidence.

**Regulatory Risk:** CBSE may flag schools with repeated LOC submission errors, questioning data accuracy and audit controls.

**Financial Risk:** Exam delays delay result publication, delaying fee finalization, delaying next-year admissions, delaying cash flow.

**Reputational Risk:** Parents perceive the school as disorganized. Word spreads to prospective admissions.

---

## LOC Automation: What Modern ERPs Deliver

### 1. Real-Time Eligibility Tracking

From day one of the academic year, the ERP tracks eligibility in real-time:

- Attendance is recorded daily; the system calculates running percentage
- Internal assessment marks are submitted and logged
- Exam fees are tracked; paid status is recorded
- Aadhaar numbers are verified upon enrollment or updated during the year

At any point, the principal can run an "eligibility report" showing which students are eligible, which are not, and why (e.g., "35 students have <75% attendance").

### 2. Auto-Generated LOC in CBSE Format

When LOC submission date approaches, the ERP auto-generates LOC:

- Filters students based on eligibility criteria (≥75% attendance, all internal marks submitted and moderated, exam fees paid, valid Aadhaar, no holds)
- Exports data in CBSE-mandated CSV format (correct column order, correct data types, correct encoding)
- Includes only eligible students; excludes ineligible students with a clear reason logged

This eliminates manual data extraction and formatting, which is the source of most errors.

### 3. Pre-Submission Validation

Before the school submits to CBSE, the ERP validates:

- No duplicate roll numbers or Aadhaar numbers
- All Aadhaar numbers are exactly 12 digits
- All student names are properly formatted (no special characters that might corrupt in transmission)
- Subject codes match CBSE's exact codes for the school's curriculum
- All mandatory fields are populated
- File encoding is UTF-8

The system shows schools exactly what CBSE will receive: "500 students eligible, 12 validation warnings (see details below), 0 critical errors. Proceed or fix first?"

Schools can fix issues before submission, not after CBSE rejects the file.

### 4. CBSE Submission Integration

Some ERPs integrate directly with CBSE's LOC portal. Schools click "Submit to CBSE" within the ERP, and the system uploads the LOC file and logs the submission timestamp. Schools don't manually upload and navigate CBSE's portal; the process is automated.

### 5. Hall Ticket Reconciliation

After CBSE generates hall tickets, the ERP imports them and automatically reconciles:

- Every eligible student in LOC should have a hall ticket. If not, alert the school.
- Every hall ticket should correspond to an enrolled student in LOC. If not, alert the school.
- Discrepancies are flagged for principal review and CBSE contact

### 6. Audit Trail and Compliance Documentation

The ERP logs:

- When LOC was generated
- Which students were included and which were excluded (and why)
- When LOC was submitted to CBSE
- CBSE's response (accepted or rejected, with error details if any)
- When corrections were made
- When hall tickets were received and distributed

If CBSE audits the school later, all documentation is ready. If a student's parent questions why their child was excluded from LOC, the school can show the exact eligibility criteria and the student's data (attendance %, internal marks status, fee payment status).

---

## Best Practices: Ensuring LOC Submission Success

### Verify Data Quality Early

Don't wait until LOC submission date to verify student data. Start in January (for March board exams) or June (for October board exams):

- Run an eligibility report and review manually
- Correct any data quality issues (misspelled names, incomplete Aadhaar numbers, incorrect DOB formats)
- Ensure all students have valid Aadhaar numbers; resolve any gaps before LOC submission date

### Communicate Eligibility Criteria to Students and Parents

At the beginning of Class 10 and 12, communicate clearly: "To be eligible for the board exam, you must maintain ≥75% attendance, submit all internal assessments, pay exam fees by [date], and have a valid Aadhaar number." Display running eligibility status in the student and parent portals.

### Generate Practice LOCs

Before the official LOC submission date, generate practice LOCs. Export, validate, and review. Correct any issues. This rehearsal catches problems before the high-stakes submission.

### Submit LOC Early

CBSE opens the LOC portal 3–4 months before exams. Submit within the first 2 weeks, not on the deadline. This gives time for corrections if CBSE raises issues. Last-minute submissions are high-risk.

### Automate Hall Ticket Reconciliation

As soon as CBSE provides hall tickets, import them into the ERP and run reconciliation. If discrepancies appear, contact CBSE immediately. Don't wait until one week before exams.

### Document Everything

Maintain a LOC submission log: dates, files submitted, CBSE's responses, corrections made, final confirmation. This is your audit trail.

---

## Why This Matters: The Nexli Difference

---

**Founder's Insight:**

The difference between a school using spreadsheets and a school using Nexli isn't just speed. It's visibility. A principal used to discovering problems weeks after they happen, whether a chronically absent student, a teacher not submitting lesson plans, or fees slipping, suddenly has real-time alerts. Yashveer Singh designed this visibility not to add surveillance, but to enable early intervention. Problems get smaller when you catch them early. That insight shaped how Nexli highlights exceptions and surfaces risks.

---

**Company Perspective:**

The team behind Yashveer Labs includes developers, designers, former school administrators, and parents. That diversity of perspective means product decisions are challenged from multiple angles. A feature that looks good to an engineer might feel wrong to someone who's managed a school. A workflow that makes sense to a developer might be frustrating to a teacher. That tension between perspectives is valuable: it's where better solutions emerge.

---

**Nexli's Implementation:**

Nexli automates LOC from start to finish. Real-time eligibility tracking shows the principal at any moment who is eligible for the board exam and why. When LOC submission date approaches, Nexli auto-generates LOC in CBSE's exact format. Pre-submission validation catches 100% of common errors before CBSE sees the file. After submission, hall ticket reconciliation is automatic, surfacing discrepancies immediately. Every step is logged and auditable. What once took 5–7 days and 3–5 errors now takes 2–3 hours with zero errors. Principals and coordinators can focus on teaching quality, not LOC logistics.

---

## Call to Action

LOC submission shouldn't be a three-week crisis. Eligibility should be visible in real-time, LOC should be generated automatically, and validation should happen before submission, not after CBSE rejects the file.

**[Schedule a 20-minute demo with Nexli](/demo)** to see real-time eligibility tracking, auto-generated LOC, and pre-submission validation in action. Bring your most recent LOC submission; we'll show you how Nexli would have streamlined it.

---

## Frequently Asked Questions

**Q1: What eligibility criteria does Nexli use to determine LOC-eligible students?**

Nexli tracks all CBSE-mandated criteria: ≥75% attendance, all internal assessment marks submitted and moderated, exam fees paid, valid Aadhaar number, no academic or conduct suspensions, and no departmental holds. Schools can also configure additional criteria if needed. The eligibility dashboard updates in real-time.

**Q2: Can Nexli auto-generate LOC for schools with multiple sections?**

Yes. Nexli generates LOC for all sections, all subjects, and multiple exam mediums if applicable. The system handles Class 10 and Class 12 LOC separately. Subject codes are automatically mapped to CBSE's official codes for your school's curriculum.

**Q3: What happens if a student becomes ineligible after LOC is generated?**

If a student becomes ineligible after LOC submission (e.g., attendance drops below 75%), Nexli flags this immediately. Schools can contact CBSE to remove the student from LOC and submit a corrected LOC. Nexli tracks all LOC versions and changes.

**Q4: Does Nexli validate character encoding?**

Yes. Nexli ensures all names, subject descriptions, and text data are encoded in UTF-8 (CBSE's requirement). Special characters and diacritics are preserved correctly. This prevents the encoding errors that often appear when CBSE processes manually-formatted CSVs.

**Q5: Can Nexli integrate with CBSE's LOC portal directly?**

Yes. Nexli can integrate with CBSE's submission portal, allowing schools to submit LOC directly from Nexli without manual uploading. Submission timestamps and CBSE's responses are logged automatically.

---

## Related Articles

- [CBSE School Management: Unique Requirements and System Solutions](/blog/cbse-school-management-unique-requirements)
- [CBSE Affiliation: What the ERP Should Track](/blog/cbse-affiliation-erp-tracking)
- [Internal Assessment and Moderation in CBSE: Complete Workflow](/blog/cbse-internal-assessment-moderation)
- [CBSE Board Exam Preparation: How Your ERP Should Support It](/blog/cbse-board-exam-preparation-erp-support)
- [Transfer Certificate Format in CBSE ERPs: Automation and Compliance](/blog/cbse-transfer-certificate-format-erp)
