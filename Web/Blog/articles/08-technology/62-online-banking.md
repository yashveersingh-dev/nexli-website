---
title: "Online Banking for Schools: Authorization, Bank Reconciliation, and ERP Integration"
slug: "62-online-banking"
meta_description: "Online banking for schools requires authorized signatories, dual approval workflows, NEFT/RTGS for payroll and vendor payments, and bank reconciliation with the ERP fee ledger."
category: "Technology & Digital Transformation"
primary_keyword: "online banking for schools"
secondary_keywords:
  - "school bank reconciliation"
  - "dual approval banking"
  - "NEFT RTGS school payments"
intent: "educational"
author: "Yashveer Labs"
date: "2026-06-19"
branding_block_founder: 6
branding_block_company: 6
branding_block_nexli: 6
---
## Online Banking for Schools: Setting It Up Correctly from the Start

Online banking for schools involves more than getting internet banking access from your bank. Schools handle public funds, trust money, or society funds depending on their registration structure. The banking controls need to reflect that: who can initiate a payment, who must approve it, and how the bank records reconcile with the ERP.

Getting these controls wrong creates two problems: financial risk (unauthorized payments are possible) and audit risk (bank statements do not match the books).

### Authorized Signatories and Dual Approval

Most schools operate under a trust, society, or section 8 company structure. The governing documents typically specify who can authorize payments and up to what limit. For example: the principal can authorize routine payments up to ₹25,000; anything above requires a trustee's signature.

In online banking, this translates to:

**Maker-checker workflow:** One person (the bursar or accountant) initiates the payment. A second person (the principal, trustee, or chairman) approves it. The bank processes the payment only after both steps are complete. Most banks offer this as "dual authorization" in their corporate internet banking product.

**Payment limits by signatory:** The bank account can be configured with transaction limits per authorizer. The principal's approval is sufficient for amounts up to ₹25,000; amounts above require trustee-level approval. These limits should match what the governing documents specify.

**Maker cannot be checker:** The person who initiates a payment should not be the same person who approves it. This is a basic internal control that prevents a single person from initiating and approving fraudulent payments.

### Payment Types Schools Use Regularly

**NEFT (National Electronic Funds Transfer):** Used for salary disbursement (processed as bulk NEFT to all staff bank accounts), vendor payments, and statutory remittances. NEFT settles during banking hours and is appropriate for non-urgent payments.

**RTGS (Real Time Gross Settlement):** Used for high-value payments (minimum ₹2 lakh) where same-day settlement is needed. Typically used for large vendor payments or trust-level transfers.

**IMPS (Immediate Payment Service):** Used for smaller urgent payments, available 24/7. More expensive per transaction than NEFT.

**UPI:** Used for fee collection from parents (incoming payments). Not typically used for school outgoing payments due to per-transaction limits.

### Bank Reconciliation with the ERP

Bank reconciliation is the process of matching what the bank statement shows with what the ERP records show. For a school with 300 students paying fees, this means matching hundreds of incoming transactions every month.

The reconciliation challenge for schools:

**UPI and online fee payments:** When a parent pays through UPI or the school's fee payment gateway, the transaction appears in the bank account. The ERP must match this bank credit to the specific student's fee record. Any unmatched credit needs investigation (who paid? for which student?).

**Timing differences:** A parent makes a UPI payment at 11:45 PM on the 31st. The bank settles it on the 1st. The ERP records it as the 31st (payment date). The bank statement shows the 1st. This creates a timing difference that must be handled consistently.

**Cheque clearing lag:** A parent submits a cheque on the 5th. The cheque is deposited on the 6th and clears on the 8th. The ERP records the payment on the 5th (date received) or the 8th (date cleared) depending on the school's policy. The bank statement shows the 8th. The reconciliation must handle this consistently.

A clean reconciliation process requires a defined policy for how and when each payment type is recorded in the ERP, and a weekly (not monthly) reconciliation habit so discrepancies are caught while memory is fresh.

### Staff Salary Payments

Salary processing for a school with 50-100 staff involves NEFT to every staff member's bank account. The process:

1. Payroll is processed in the ERP (or payroll software) and the net salary for each employee is calculated after EPF, ESI, and TDS deductions.
2. A bulk NEFT file is generated listing each employee's account number, IFSC code, and net salary amount.
3. The bursar uploads the bulk NEFT file to the bank's corporate internet banking portal.
4. The authorized signatory approves the batch.
5. The bank processes all transfers on the selected date.
6. The bank sends a confirmation report. This is matched against the payroll register.

### EPF, ESI, and TDS Online Payments

Statutory deductions collected from salaries must be remitted to government portals by specific due dates:

- EPF: 15th of the following month (EPFO portal via NEFT/RTGS)
- ESI: 15th of the following month (ESIC portal via online payment)
- TDS: 7th of the following month (Income Tax portal via challan 281)

These are not optional payments. Late payment attracts interest (12% per annum for EPF, 18% for ESI) and potential penalties. Online banking with calendar-based payment scheduling helps ensure these are not missed.

## How Nexli Helps

Nexli's payroll module calculates net salaries after EPF, ESI, and TDS, and generates bulk payment files in standard bank formats for salary NEFT uploads. The fee module records all incoming payments with payment mode (UPI, NEFT, cash, cheque) and payment date, providing the data needed for bank reconciliation. Outstanding amounts are tracked per student with aging. Finance records can be exported for reconciliation against bank statements. Nexli does not currently connect directly to bank systems via API; the reconciliation data is available for download and comparison.

[Book a Free Demo](/demo)

---

## Frequently Asked Questions

**Q: Can Nexli connect directly to our school's bank account for reconciliation?**
A: Nexli currently generates reports that you compare against your bank statement. Direct bank API integration is not in the current release.

**Q: How does Nexli handle cheque payments that have been received but not yet cleared?**
A: Nexli records the cheque receipt date and allows a separate "cleared" date to be updated when the bank confirms clearance. Reports can filter by either date.

**Q: Can we restrict which staff can view the fee collection and banking reports?**
A: Yes. Nexli's permission matrix controls which roles can view finance data. The accountant can see full fee and payment data; a class teacher cannot see fee reports at all.

**Q: Does Nexli generate the EPF and ESI challan data automatically?**
A: Nexli's payroll module calculates EPF and ESI contributions per employee. The challan data (total contribution by employee category) is available for download. The actual challan submission happens on the relevant government portal.

**Q: What happens if a parent's UPI payment fails after they see a "payment successful" message?**
A: This is a known edge case with UPI payments. Nexli marks the payment as "received" only when the payment gateway confirms settlement, not on the parent's success screen. Failed settlements appear as unresolved transactions in the fee reconciliation report.
