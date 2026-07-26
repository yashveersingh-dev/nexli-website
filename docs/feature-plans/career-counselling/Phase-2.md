# Career Counselling & Aptitude Engine — Phase 2 (full battery, college & scholarship matching)

> Builds on Phase 1's RIASEC + aptitude engine. Adds the remaining assessment lenses,
> a richer career library, and the **college + scholarship matcher** that turns a
> recommendation into actionable next steps for the Indian student.

## New / extended capabilities

### 1. Full multi-lens battery
- Add **Multiple Intelligences** (Gardner, 8 intelligences), **Personality**
  (lightweight Big-Five / 4-axis), **Learning style (VAK)**, and **EQ** scales as
  additional `assessment_defs` + items.
- The scoring engine extends to combine all lenses into a richer profile and a more
  nuanced career fit (still fully deterministic/offline).
- **Class-band variants**: explorer (8–9), decision (10), refinement (11–12) with
  band-appropriate items and reports.

### 2. College / course matcher
- New `college_library` (curated seed; school/region-editable):
  ```
  { id, name, type: 'university'|'college'|'iti'|'polytechnic',
    location: { state, city }, streams: string[], courses: string[],
    entranceExams: string[], approxFeesInr?, ownership: 'govt'|'private',
    website?, active }
  ```
- `matchColleges(result, prefs)` → ranked colleges by recommended stream + career +
  location + budget + entrance exam. Student saves a shortlist (`college_shortlist`).

### 3. Scholarship matcher
- New `scholarship_library` (curated seed; maps to NSP/state schemes):
  ```
  { id, name, provider, type: 'merit'|'means'|'category'|'merit_cum_means',
    eligibility: { classBands, categories, incomeMaxInr?, minMarksPct?, state? },
    amountInr?, deadline?, applyUrl?, active }
  ```
- `matchScholarships(student, marks, result, profile)` → eligible scholarships using
  the student's class, category, income band (from student record) and marks
  (gradebook). Shows deadlines + apply links. Live NSP sync stays ⛔ blocked; seed only.

### 4. Entrance-exam calendar
- `exam_calendar` `{ id, exam, stream, applyWindow, examDate, resultDate, url }` →
  a personalised "exams relevant to your recommendation" list with dates.

### 5. Richer, explainable report
- Combined profile visual (RIASEC + MI + aptitude + personality), per-stream fit with
  drivers, top careers with full pathway (subjects → entrance exam → college → role),
  matched colleges + scholarships + exam dates — a complete printable guidance pack.

## Data model additions
- `college_library`, `scholarship_library`, `exam_calendar` (above).
- `college_shortlist` `{ id, studentId, collegeId, note, savedAt }`.
- Extend `career_results` with `collegeMatches`, `scholarshipMatches`, `examDates`.

## Screens
- Extended assessment runner for the new lenses.
- `CollegeMatcherPage`, `ScholarshipMatcherPage`, `ExamCalendarPage` (student +
  counsellor); shortlist management.
- Library managers (college/scholarship/exam) for counsellor/coordinator.

## Role gating
- Library + calendar management: counsellor/coordinator/principal.
- Students: take full battery, view shared report, save shortlists.

## Cross-module reuse
- Marks/category from `students` + gradebook for scholarship eligibility.
- Outcomes flow into the **Skills Passport** application pack (Phase 3 there).

## Acceptance
- A student completes the full battery; the report combines all lenses deterministically.
- College + scholarship + exam matches are correct for the student's stream, marks,
  category and income band, with working apply links and deadlines.
- Live national data sync remains a clearly labelled seed-only / approval-pending
  shell — never faked.
