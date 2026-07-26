> **DRAFT — must be reviewed by a qualified Indian lawyer before use. Not legal advice.**

_Last updated: 2026-06-19_

# Data Processing Agreement (DPA) — Nexli School Management Platform

This Data Processing Agreement ("**DPA**") forms part of the Terms of Service between the School ("**School**", "**Data Fiduciary**") and Nexli ("**Nexli**", "**Data Processor**", "**we**") and governs Nexli's processing of personal data on the School's behalf when the School uses the Nexli platform ("**Service**"). It is intended to align with the **Digital Personal Data Protection Act, 2023 ("DPDP Act")** and the **IT Act, 2000** and **SPDI Rules, 2011**.

In case of conflict between this DPA and the Terms of Service on matters of personal-data processing, this DPA prevails.

---

## 1. Roles

1.1 The **School is the Data Fiduciary** and determines the purposes and means of processing personal data entered into the Service.
1.2 **Nexli is a Data Processor** and processes personal data only on the School's documented instructions, as set out in this DPA, the Terms and the Privacy Policy.
1.3 The School is responsible for the lawfulness of the data it provides and for obtaining any required consents (including **verifiable parental consent** under DPDP **s.9** for children's data).

## 2. Scope, nature and purpose of processing

2.1 **Nature:** hosting, storage, organisation, retrieval, transmission, and deletion of personal data through the Service's modules.
2.2 **Purpose:** to provide the school-management functionality the School configures — academics, attendance, fees, communication, compliance, safeguarding, and related administration — and to secure and support the Service.
2.3 **Duration:** for the term of the subscription and until data is returned or deleted per Section 11.

## 3. Categories of data principals

- **Students** (minors), including prospective students/applicants.
- **Parents / guardians.**
- **Staff** (teaching and non-teaching) and authorised School users.

## 4. Categories of personal data

- **Student data:** identity (name, DOB, gender, photograph, admission/roll no., class, address), government identifiers where recorded (e.g. Aadhaar for RTE/UDISE+), academic records, attendance, health/emergency data, transport/hostel/library/canteen operational data, and welfare records (counselling, special education, child protection).
- **Parent/guardian data:** identity and contact data, relationship, income where recorded for EWS/RTE, and consent decisions.
- **Staff data:** identity, contact, employment, payroll and leave data, authentication identifiers.
- **Technical data:** authentication identifiers and audit logs.

> Nexli does **not** collect biometric data. Health and certain identifiers are **sensitive** and are subject to restricted access (Section 6).

## 5. Processor obligations under the DPDP Act

Nexli shall:
1. **Process only on instructions** — process personal data solely on the School's documented instructions (including via the Service's configuration), unless required by law to do otherwise, in which case it will inform the School unless legally prohibited.
2. **Confidentiality** — ensure persons authorised to process personal data are bound by confidentiality.
3. **Security** — implement reasonable technical and organisational security measures (Annexure A).
4. **Sub-processors** — engage sub-processors only as permitted in Section 7.
5. **Assist with data-principal rights** — provide tools and reasonable assistance to help the School respond to access, correction, erasure, grievance and nomination requests (Section 8).
6. **Assist with obligations** — provide reasonable assistance to the School with security, breach handling, and (where applicable) data-protection impact assessments.
7. **Breach notification** — notify the School of a personal-data breach **without undue delay and in any event within seventy-two (72) hours** of becoming aware, with available details, so the School can meet its obligations to the **Data Protection Board of India** and affected data principals (Section 9).
8. **Deletion/return** — on termination, delete or return personal data per Section 11.
9. **Audit** — make available information necessary to demonstrate compliance and allow for audits per Section 10.

## 6. Restricted and sensitive data

Nexli applies least-privilege role-based access control. The most sensitive records — **child protection (POCSO)**, **counselling**, and **health** — are technically restricted to a small set of authorised roles configured by the School, and are not visible to general staff. Government identifiers (e.g. Aadhaar) are access-restricted.

## 7. Sub-processors

7.1 The School authorises Nexli to engage sub-processors to provide the infrastructure necessary to run the Service. The principal sub-processor is **Google LLC / Google Cloud (Firebase Authentication and Cloud Firestore)**, used for authentication and database hosting, with data hosted in a **Google Cloud India region** where available.
7.2 Nexli imposes data-protection obligations on sub-processors that are no less protective than this DPA.
7.3 Nexli will maintain a current list of sub-processors and give the School reasonable prior notice of any intended addition or replacement, allowing the School to object on reasonable data-protection grounds.

## 8. Assisting with data-principal rights

The Service provides a **consent register** (purpose-by-purpose consent and withdrawal) and a **data-erasure-request register** to help the School action access, correction and erasure requests. Nexli will provide reasonable additional assistance where a request cannot be fulfilled through self-service features.

## 9. Personal-data breach

9.1 On becoming aware of a personal-data breach affecting the School's data, Nexli will notify the School **without undue delay and within 72 hours**, describing (to the extent known) the nature of the breach, categories and approximate number of data principals and records affected, likely consequences, and measures taken or proposed.
9.2 Nexli will cooperate with the School and take reasonable steps to mitigate the breach. Nexli maintains an internal breach-notification register.
9.3 The School, as Data Fiduciary, is responsible for notifying the Data Protection Board of India and affected data principals as required by law.

## 10. Audit rights

10.1 Nexli will make available to the School information reasonably necessary to demonstrate compliance with this DPA.
10.2 On reasonable prior written notice, not more than once per year (or following a breach or where required by a regulator), the School may audit Nexli's relevant controls, or accept a third-party assessment/report in lieu, subject to confidentiality and not unreasonably disrupting Nexli's operations.

## 11. Return and deletion on termination

On expiry or termination, and at the School's choice, Nexli will **return** the School's personal data in a commonly used format and/or **delete** it within **[30] days**, except to the extent retention is required by applicable law. The School may also export data using available features before termination.

## 12. International transfer

Personal data is intended to be hosted and processed in **India**. Any transfer or processing outside India will be carried out consistently with the DPDP Act and any restrictions notified by the Central Government, and subject to appropriate safeguards and the obligations in this DPA.

## 13. Liability and term

13.1 Liability under this DPA is subject to the limitations in the Terms of Service, except where applicable law provides otherwise.
13.2 This DPA remains in force for as long as Nexli processes personal data on the School's behalf.

---

## Annexure A — Technical and Organisational Measures (TOMs)

Nexli implements measures appropriate to the risk, including:

**Access control**
- Multi-tenant isolation: each School's data is structurally separated under its own tenant scope, enforced both in application logic and server-side security rules.
- Role-based access control with least privilege; the most sensitive records (POCSO, counselling, health, government identifiers) restricted to a minimal set of authorised roles.
- Authentication via a managed identity provider (Google Firebase Authentication).

**Encryption**
- Encryption in transit (HTTPS/TLS).
- Encryption at rest provided by the underlying cloud platform.

**Integrity and availability**
- Managed, redundant cloud database (Google Cloud Firestore) with platform-level durability.
- Audit logging of significant actions (creation/modification of sensitive records, consent changes, exports).

**Operational measures**
- Least-privilege administrative access and confidentiality obligations on personnel.
- Change management and security review of releases.
- Internal breach-notification register and defined breach-handling process (72-hour notification to Schools).
- Data minimisation: collection limited to what is necessary; identifiers in sensitive records kept to the minimum.

**Children's data safeguards (DPDP s.9)**
- No targeted advertising to, or behavioural tracking/monitoring of, children.
- Verifiable-parental-consent workflow supported via the consent register.

---

_This is a draft template and contains placeholders (retention period, sub-processor list, audit cadence). It must be reviewed and finalised by a qualified Indian lawyer, and executed per School, before use._
