---
title: "Data Security in the Cloud: What Indian Schools Should Ask Their ERP Vendor"
slug: "22-data-security-in-cloud"
meta_description: "Data security in cloud ERP for schools. Understand encryption, access control, audit logs, and breach response. Questions every Indian school must ask their ERP vendor."
category: "Technology & Digital Transformation"
primary_keyword: "cloud data security school ERP"
secondary_keywords:
  - "school ERP data security India"
  - "student data encryption cloud"
  - "ERP security schools"
  - "cloud school data protection"
intent: "educational"
author: "Yashveer Labs"
date: "2026-06-19"
branding_block_founder: 6
branding_block_company: 6
branding_block_nexli: 6
---
## What Data Security Layers Should a School Expect from a Cloud ERP?

A school's cloud ERP should provide four layers of data security: encryption at rest and in transit, access control through role-based permissions, comprehensive audit logging, and a documented breach response procedure. Schools that don't verify these protections before signing an ERP contract are entrusting sensitive student and financial data to systems they haven't evaluated. This guide explains what each layer means and the specific questions to ask every vendor.

## Why School Data Security Matters

Schools hold some of the most sensitive personal data of any institution: children's names, addresses, dates of birth, photographs, health information, academic records, family financial information, and parent contact details. A data breach at a school affects minors who cannot protect themselves and parents who trusted the school with their private information.

In addition to the ethical obligation, the DPDP Act 2023 creates legal obligations to protect personal data with "reasonable security safeguards." Failing to meet these obligations can result in regulatory penalties.

## Layer 1: Encryption

Encryption converts data into an unreadable format that can only be decoded with the correct key. There are two types of encryption relevant to school ERPs.

**Encryption in transit (data moving between devices and the server):**
All data sent between a user's browser or phone and the ERP's servers should be encrypted using TLS (Transport Layer Security). You can verify this: when you open the ERP in a browser, the URL should begin with "https://" and show a padlock icon. If you see "http://" without the "s," the data is not encrypted in transit.

**Encryption at rest (data stored on the server):**
Data stored in the ERP's database should be encrypted using AES-256 or equivalent standard encryption. This means that if someone were to access the physical storage media (e.g., a hard drive from a data center), the data would be unreadable without the encryption key.

**Questions to ask your vendor:**
- "Do you encrypt data in transit using TLS 1.2 or higher?"
- "Is data encrypted at rest? What encryption standard do you use?"
- "Where are encryption keys stored and managed?"

A vendor who cannot answer these questions clearly, or who says "we trust the cloud provider to handle security," has not implemented security adequately at the application layer.

## Layer 2: Access Control

Access control determines who can see, edit, delete, or export specific data. For school data security, access control is critical because different staff members should have access to only the data they need.

**Role-based access control (RBAC):** The ERP assigns permissions based on the user's role. A class teacher sees only her students' data. The principal sees school-wide data. The accounts clerk sees fee data but not medical records. A transport manager sees route assignments but not academic grades.

Effective RBAC means: if a teacher's account is compromised (hacked, stolen credentials), the attacker only accesses what the teacher can access, not the entire database.

**Authentication security:**
- Multi-factor authentication (MFA): After entering a password, the user receives a code on their phone. This prevents unauthorized access even if a password is stolen.
- Password strength requirements: The system should require passwords of at least 8-12 characters with a mix of letters, numbers, and symbols.
- Session timeouts: After a period of inactivity, the system logs out automatically, preventing unauthorized access on shared or unattended devices.
- Account lockout after failed attempts: After 5-10 failed login attempts, the account is locked temporarily, preventing brute-force attacks.

**Questions to ask your vendor:**
- "How is role-based access control implemented? Can you show me what a teacher sees vs. what a principal sees?"
- "Do you support multi-factor authentication?"
- "What happens after multiple failed login attempts?"
- "How quickly can we disable a staff member's account if they leave the school?"

## Layer 3: Audit Logging

An audit log is a record of every significant action taken in the system: who logged in, who viewed which records, who made changes and what changes, who exported data.

Audit logs are essential for security because they allow you to detect unauthorized access or suspicious activity. If a fee receipt is altered, the audit log shows who made the change and when. If a student record is exported, the audit log shows who performed the export.

For DPDP Act compliance, audit logs also provide evidence that data was handled appropriately.

**What a good audit log captures:**
- User login and logout events (with timestamps and IP addresses).
- View events for sensitive records (who viewed a student's address, health information, or family details).
- Create, edit, and delete operations on any record.
- Data export operations (who exported which records).
- Permission changes (who granted or revoked access to whom).

**Questions to ask your vendor:**
- "What events does your system log?"
- "How long are audit logs retained?"
- "Can school administrators view audit logs themselves, or must you request them from vendor support?"
- "Are audit logs tamper-proof? Can someone delete an audit log record?"

## Layer 4: Breach Detection and Response

Despite best security practices, breaches can occur. What separates responsible cloud providers from negligent ones is: how quickly they detect a breach, how transparently they communicate it, and how effectively they contain the damage.

**What breach response looks like:**

Detection: The vendor has monitoring systems (intrusion detection, anomaly detection) that flag unusual activity, large data exports, access from unusual locations, multiple failed login attempts across many accounts.

Containment: Once a breach is detected, the vendor isolates the affected systems, revokes compromised credentials, and prevents further unauthorized access.

Notification: The vendor notifies the school within 24-48 hours of discovering a breach. The notification includes: what data was affected, how many users were affected, what the vendor has done, and what the school should do next.

The school then notifies the Data Protection Board of India (as required by DPDP Act) and affected individuals within the legally required timeframe.

**Questions to ask your vendor:**
- "What security monitoring do you operate?"
- "What is your breach notification policy? How quickly do you notify customers?"
- "Can you describe your most recent security incident and how you handled it?"
- "Do you have cyber liability insurance?"

## What Schools Are Responsible For

Cloud security is shared responsibility. The vendor manages infrastructure security; the school manages operational security. Schools must:

- Enforce strong passwords and (if supported) multi-factor authentication.
- Deactivate staff accounts promptly when employees leave.
- Train staff not to share credentials and to report suspicious activity.
- Not use the ERP from unsecured public Wi-Fi without VPN.
- Regularly review who has access to the system and remove access that is no longer needed.

Security breaches caused by staff sharing passwords or by accounts not being deactivated after a staff member leaves are often the school's responsibility, not the vendor's.

## How Nexli Implements Data Security

Nexli uses Firebase (Google Cloud) infrastructure, which provides TLS encryption in transit and AES-256 encryption at rest as standard. The 118+ role permission matrix, enforced through Firestore security rules that have 145 tests passing, ensures that each user accesses only the data permitted by their role. The role-based system means a teacher cannot access payroll or health records, and an accounts clerk cannot access student academic data.

Audit trails are maintained in Firestore for key operations. Account management allows school administrators to provision and deprovision user access.

[Book a Free Demo](/demo)

---

## Frequently Asked Questions

**Q: How do I verify that an ERP is actually encrypting data and not just claiming to?**
A: Check for "https://" in the URL (confirms TLS encryption in transit). Ask the vendor for their SSL certificate details and penetration testing reports. Reputable vendors undergo annual third-party security audits and can share summary reports.

**Q: What is the risk if a teacher's ERP account is hacked?**
A: With proper RBAC, the attacker accesses only what the teacher can access: her own class's attendance and grades. This is still a data breach (student names and attendance data are personal data under DPDP Act) and must be reported, but it does not expose financial data, medical records, or other staff's information.

**Q: Should we use the same password for all staff accounts?**
A: Absolutely not. Each staff member must have their own unique credentials. Shared passwords mean you cannot audit who made specific changes and cannot deactivate one person's access without resetting the password for everyone.

**Q: How often should school ERP passwords be changed?**
A: Every 6-12 months for most users. Immediately when: a staff member leaves, if a breach is suspected, or if an account shows unusual activity. If multi-factor authentication is enabled, the password rotation requirement is less urgent.

**Q: What data should schools never store in an ERP?**
A: Sensitive authentication data (passwords in plain text), bank account details of parents beyond what is necessary for payment processing, medical records beyond what is needed for in-school care, and any data the school does not have a lawful basis to process.
