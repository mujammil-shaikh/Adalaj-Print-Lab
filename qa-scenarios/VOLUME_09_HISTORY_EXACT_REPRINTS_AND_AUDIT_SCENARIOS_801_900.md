# Volume 09 — History, Reprints & Audit Trail (Scenarios 801 – 900)

**Domain:** Historical Audit Trail, Exact Cryptographic Snapshot Reprints (Zero Date Regeneration), Dynamic Batch/SKU Filters, Void/Waste Reconciliation, CSV/JSON Exports, Regulatory Audit Compliance  
**Target:** `https://adalaj-label-studio.vercel.app` & `src/components/history/HistoryView.tsx`, `src/types/printJob.ts`, `src/db/`

---

## 1. Historical Print Records & Dynamic Filtering (SCN-801 – SCN-835)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-801 | Simple | OPR | Navigate to History View | Navigation bar | Click "History" tab or press `6` | History view loads with summary statistics, search/filter bar, and print job table. | Verified |
| SCN-802 | Simple | PLN | History Summary KPI: Total Jobs | History loaded | Observe "Total Jobs" KPI card | Displays total number of recorded print jobs across all batches. | Verified |
| SCN-803 | Simple | PLN | History Summary KPI: Labels Printed | History loaded | Observe "Labels Printed" card | Aggregates all completed label counts (e.g. `24,500 Labels`). | Verified |
| SCN-804 | Simple | PLN | History Summary KPI: Success Rate | History loaded | Observe "Dispatch Success" card | Computes percentage of successful prints (e.g. `99.8%`). | Verified |
| SCN-805 | Simple | PLN | History Summary KPI: Reconciled Waste | History loaded | Observe "Recorded Waste" card | Displays total scrapped or voided label count. | Verified |
| SCN-806 | Simple | OPR | View Print Jobs Table | History loaded | Inspect table columns | Columns: Timestamp, Job ID, Batch Code, Product, SKU/Pack, Qty, Status, Actions. | Verified |
| SCN-807 | Simple | OPR | Search Print Jobs by Batch ID | History table visible | Type "2026-001" in search | Filters table to jobs belonging to batch ADTP-2026-001 immediately. | Verified |
| SCN-808 | Simple | OPR | Search Print Jobs by Product Name | History table | Type "coriander" in search | Filters table to Coriander Powder jobs. | Verified |
| SCN-809 | Medium | PLN | Filter Jobs by Status: COMPLETED | Filter dropdown | Select "COMPLETED" | Shows only successfully completed jobs. | Verified |
| SCN-810 | Medium | PLN | Filter Jobs by Status: FAILED | Filter dropdown | Select "FAILED" | Shows only failed or aborted print attempts. | Verified |
| SCN-811 | Medium | PLN | Filter Jobs by Date Range: Today | Date filter | Select "Today" | Displays jobs dispatched within current calendar day. | Verified |
| SCN-812 | Medium | PLN | Filter Jobs by Date Range: Last 7 Days | Date filter | Select "Last 7 Days" | Displays jobs within past week. | Verified |
| SCN-813 | Medium | PLN | Filter Jobs by Date Range: Custom Interval | Date filter | Select `01 Jan 2026` to `15 Jan 2026` | Filters jobs strictly within specified date range. | Verified |
| SCN-814 | Simple | OPR | Filter Jobs by Machine Station | Machine filter | Select "Station 1 - Markem-Imaje 9040" | Filters jobs dispatched to Station 1. | Verified |
| SCN-815 | Simple | OPR | Filter Jobs by Operator | Operator filter | Select "Operator #4" | Shows jobs authorized by Operator #4. | Verified |
| SCN-816 | Simple | OPR | Clear All History Filters | Filters active | Click "Reset Filters" | Clears search and dropdowns; restores full unfiltered job list. | Verified |
| SCN-817 | Medium | PLN | Sort History by Timestamp (Ascending / Descending) | Table header | Click "Timestamp" column header | Toggles sort order between newest-first and oldest-first. | Verified |
| SCN-818 | Medium | PLN | Sort History by Label Quantity | Table header | Click "Qty" column header | Sorts jobs by label count magnitude. | Verified |
| SCN-819 | Simple | OPR | Inspect Job Details Modal | Job row visible | Click "Inspect Details" or row | Modal opens showing complete job record, template specs, and operator metadata. | Verified |
| SCN-820 | Simple | OPR | View Rendered Label Thumbnail in Details | Details modal open | Observe label thumbnail | Displays high-contrast SVG / PNG thumbnail of the label as printed. | Verified |
| SCN-821 | Medium | QAC | Inspect Job Cryptographic Hash | Details modal | Inspect "Payload Hash" | Displays SHA-256 hash (e.g. `e3b0c44...`) guaranteeing data immutability. | Verified |
| SCN-822 | Simple | OPR | Empty History State | Clean database | View History | Displays empty state: "No print jobs recorded yet. Dispatched jobs will appear here." | Verified |
| SCN-823 | Medium | PLN | Pagination: 25 / 50 / 100 Rows per Page | Table footer | Select "50 per page" | Updates table view to display 50 rows per page with page navigation. | Verified |
| SCN-824 | Simple | PLN | Next / Previous Page Navigation | Page 1 visible | Click "Next Page" | Advances to Page 2 smoothly. | Verified |
| SCN-825 | Complex | MNT | History Table Virtualization (10,000+ Records) | Seed 10,000 history records | Scroll table | Virtual window rendering maintains 60 FPS scrolling without DOM bloat. | Verified |
| SCN-826 | Simple | OPR | Copy Job ID to Clipboard | Job row | Click copy icon next to Job ID | Copies canonical ID (e.g. `job_1730829100`) to clipboard; shows tooltip. | Verified |
| SCN-827 | Medium | QAC | View Operator Verification Signature | Job details | Inspect "Authorized By" | Displays operator username, role, and digital signature timestamp. | Verified |
| SCN-828 | Simple | MNT | View Machine Dispatch Transport in Details | Job details | Inspect "Transport" | Displays "Native TCP Socket (192.168.1.101:9100) via Local Agent". | Verified |
| SCN-829 | Medium | PLN | Filter History by SKU Pack Size | Filter dropdown | Select "100 g Pouch" | Displays only jobs printed for 100g pack size. | Verified |
| SCN-830 | Complex | QAC | History Cross-Link to Batch View | Job details | Click batch code `ADTP-2026-001` link | Navigates directly to Batches view with batch details pre-opened. | Verified |
| SCN-831 | Complex | QAC | History Cross-Link to Product View | Job details | Click product name link | Navigates directly to Products view with product selected. | Verified |
| SCN-832 | Simple | OPR | History Status Badge Color Coding | Job rows | Inspect badges | COMPLETED (Green), FAILED (Red), CANCELLED (Amber), REPRINT (Purple). | Verified |
| SCN-833 | Medium | PLN | Quick Reprint Button on Table Row | Job row | Hover on row | Quick "Reprint" button appears in actions column. | Verified |
| SCN-834 | Simple | OPR | Mobile Card View for History | View on 375px mobile | Scroll history | Table cleanly transitions to stacked mobile cards with prominent Reprint buttons. | Verified |
| SCN-835 | Complex | PLN | Volume 9 History Filter Milestone Check | Complex filter test | Filter by Batch + Status + Date range -> verify accurate subset | 100% verified dynamic history querying. | Verified |

---

## 2. Exact Cryptographic Snapshot Reprints (SCN-836 – SCN-865)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-836 | Simple | OPR | Trigger Exact Reprint | Job `job_001` selected | Click "Reprint Labels" | Opens Exact Reprint Confirmation modal. | Verified |
| SCN-837 | Complex | QAC | Strict Preservation of Historical Dates | Original job printed 3 weeks ago | Inspect preview dates | Retains original MFD `15/01/2026` and Best Before `14/07/2026`. NEVER re-calculates to today! | Verified |
| SCN-838 | Complex | QAC | Strict Preservation of Historical Commercial MRP | Product MRP changed since job ran | Inspect preview MRP | Retains original MRP ₹65.00 from snapshot. NEVER pulls updated master catalog price! | Verified |
| SCN-839 | Complex | QAC | Strict Preservation of Template Layout Snapshot | Template design changed since job ran | Inspect preview layout | Renders exact immutable layout stored at moment of print. Historical truth preserved! | Verified |
| SCN-840 | Simple | OPR | Specify Reprint Quantity | Reprint modal open | Enter quantity `20` labels | Sets reprint count to 20 (e.g. to replace damaged cartons). | Verified |
| SCN-841 | Complex | QAC | Mandatory Operator Reprint Reason | Reprint modal open | Observe reason field | Reason is required. Operator must select from dropdown or enter text. | Verified |
| SCN-842 | Simple | OPR | Select Reprint Reason: Carton Damage | Dropdown open | Select "Labels damaged during carton sealing" | Sets reason code `REASON_PACK_DAMAGE`. | Verified |
| SCN-843 | Simple | OPR | Select Reprint Reason: Smudged / Jammed Print | Dropdown open | Select "Printer jam / ribbon wrinkle" | Sets reason code `REASON_PRINTER_JAM`. | Verified |
| SCN-844 | Simple | OPR | Select Reprint Reason: Quality Lab Retain Samples | Dropdown open | Select "QA Retain / Archival Samples" | Sets reason code `REASON_QA_SAMPLE`. | Verified |
| SCN-845 | Complex | QAC | Supervisor Authorization for Large Reprints (> 50) | Enter reprint quantity `150` | Observe modal | Warning: "Reprints over 50 labels require Supervisor PIN sign-off." | Verified |
| SCN-846 | Complex | QAC | Supervisor PIN Verification for Reprint | Supervisor enters PIN | Click "Authorize Reprint" | Validates PIN against supervisor credentials; logs authorization in audit record. | Verified |
| SCN-847 | Medium | OPR | Confirm & Dispatch Reprint | All fields valid | Click "Confirm & Dispatch Reprint" | Dispatches exact snapshot payload to printer; creates new linked job with type `REPRINT`. | Verified |
| SCN-848 | Simple | OPR | Reprint Badge in History Table | New reprint job created | View History table | Displays purple badge: "REPRINT (Parent: job_001)". | Verified |
| SCN-849 | Complex | PLN | Mass Balance Deductions on Reprints | 20 labels reprinted | Check batch mass balance | Prompts operator: "Did these 20 labels consume replacement product powder?" | Verified |
| SCN-850 | Complex | PLN | Packaging Waste Accounting (No Powder Deducted) | Labels damaged before filling | Select "Label Waste Only (Powder Not Lost)" | Records 20 labels packaging scrap; does NOT deduct powder mass from batch balance. | Verified |
| SCN-851 | Complex | PLN | Product Loss Accounting (Powder Also Lost) | Sachet burst during sealing | Select "Spill Loss (Powder Lost)" | Deducts $20 \times 100\text{g} = 2\text{kg}$ from batch finished goods into scrap ledger! | Verified |
| SCN-852 | Simple | OPR | View Reprint Lineage Tree | Job details | Click "View Lineage" | Displays visual tree connecting Original Print Job -> Reprint #1 -> Reprint #2. | Verified |
| SCN-853 | Complex | QAC | Immutable Snapshot Hash Comparison | Inspect original and reprint | Compare SHA-256 hashes | Confirms both payloads generate identical raster hash; zero divergence. | Verified |
| SCN-854 | Simple | OPR | Cancel Reprint Modal | Modal open | Click "Cancel" or press `Escape` | Closes modal without creating records or dispatching hardware. | Verified |
| SCN-855 | Medium | MNT | Reprint to Alternative Printer | Station 1 busy | Select "Station 2" for reprint | Dispatches identical snapshot bytes formatted for Station 2 hardware. | Verified |
| SCN-856 | Complex | QAC | Disallow Reprint of Voided Job | Job marked as `VOID` | Inspect actions | "Reprint" button disabled with tooltip: "Cannot reprint from a voided job record." | Verified |
| SCN-857 | Simple | OPR | Print Single Specimen from History | Job details open | Click "Print 1 Specimen" | Dispatches exactly 1 sample copy for optical review. | Verified |
| SCN-858 | Medium | PLN | Track Cumulative Reprint Ratio | Batch summary | Inspect reprint KPI | Displays: "Cumulative Reprints: 45 labels (0.9% of batch run)". | Verified |
| SCN-859 | Complex | QAC | High Reprint Alert (> 3%) | Reprints exceed 3% of batch | System alert | Raises quality non-conformance flag for operator investigation. | Verified |
| SCN-860 | Simple | OPR | Reprint Reason Notes Field | Reason selected | Add note: "Station 1 guide rail misaligned at carton #120" | Notes bound permanently to reprint record. | Verified |
| SCN-861 | Medium | PLN | Search History by Reprint Status | History filter | Check "Show Only Reprints" | Filters table to display only reprint records across all batches. | Verified |
| SCN-862 | Complex | MNT | Snapshot Storage Space Optimization | 50 reprints of same job | Inspect DB size | Stores shared reference to original template snapshot; saves storage. | Verified |
| SCN-863 | Simple | OPR | Reprint Confirmation Sound | Reprint dispatched | Audio feedback | Plays confirmation chime. | Verified |
| SCN-864 | Medium | QAC | Reprint Watermark Option | Regulatory compliance | Toggle "Stamp 'REPRINT' on Margin" | Adds subtle 0.5mm text "REPRINT" on non-scannable margin if required by local SOP. | Verified |
| SCN-865 | Complex | QAC | Volume 9 Exact Reprint Milestone Check | Exact reprint test | Verify dates never change, MRP never changes, reason logged, mass reconciled | 100% verified historical snapshot reproducibility. | Verified |

---

## 3. Voiding, Waste Reconciliation & Audit Exports (SCN-866 – SCN-900)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-866 | Simple | OPR | Open Void Job Dialog | Select job in history | Click "Void Job" | Opens Void Confirmation dialog with mandatory reason prompt. | Verified |
| SCN-867 | Complex | QAC | Void Job Authorization | Operator enters reason "Batch recalled by QA" | Supervisor signs with PIN | Job status transitions to `VOID`; displays red strikethrough badge. | Verified |
| SCN-868 | Complex | PLN | Reconcile Mass on Voided Job | Job had 500 labels printed | Confirm void | System prompts to restore mass to batch or declare as physical scrap. | Verified |
| SCN-869 | Simple | OPR | View Voided Jobs Filter | History filter | Select "VOID" | Displays all voided job records with void timestamps and supervisors. | Verified |
| SCN-870 | Simple | PLN | Export History to CSV | History view loaded | Click "Export (CSV)" | Generates and downloads RFC-4180 compliant CSV of all filtered history rows. | Verified |
| SCN-871 | Medium | PLN | CSV Column Completeness | Open downloaded CSV | Verify columns | Includes: JobID, Timestamp, BatchID, Product, SKU, PackSize, Qty, Status, Operator, Machine. | Verified |
| SCN-872 | Complex | MNT | Export Full Audit Trail to JSON | History view | Click "Export Audit Trail (JSON)" | Downloads comprehensive JSON file containing raw event logs, hashes, and diffs. | Verified |
| SCN-873 | Simple | PLN | Export Filtered History Subset | Filter applied (only January) | Click "Export (CSV)" | Exports only rows matching active filter criteria. | Verified |
| SCN-874 | Medium | QAC | Regulatory Inspection Printout | History view | Click "Print Audit Report (PDF)" | Generates formal printable inspection document with company header. | Verified |
| SCN-875 | Complex | QAC | Comprehensive Audit Log Inspector | Settings / Audit | Open Audit Log | Displays raw immutable event stream: `LOGIN`, `BATCH_CREATE`, `PREFLIGHT_PASS`, `PRINT_DISPATCH`, etc. | Verified |
| SCN-876 | Simple | QAC | Search Audit Logs by Operator | Audit log open | Type "Operator #4" | Filters all actions performed by Operator #4. | Verified |
| SCN-877 | Simple | QAC | Search Audit Logs by Action Type | Audit log open | Filter `PRINT_DISPATCH` | Shows every hardware dispatch event with millisecond timestamps. | Verified |
| SCN-878 | Complex | MNT | Tamper-Evident Hash Chain Verification | Audit log open | Click "Verify Audit Integrity" | Validates cryptographic hash pointers between consecutive log entries; reports 0 tampering. | Verified |
| SCN-879 | Medium | PLN | Production Waste Summary by SKU | History / Reports | View Waste Summary | Displays bar chart of wasted labels broken down by pack size. | Verified |
| SCN-880 | Complex | PLN | Waste Financial Loss Calculation | 350 wasted labels at ₹0.85/label | View Waste Report | Computes total packaging material loss: ₹297.50. | Verified |
| SCN-881 | Simple | OPR | Record Defective Label Roll | New roll has 15 pre-damaged labels | Click "Log Defective Roll Waste" | Records supplier packaging defect in waste ledger. | Verified |
| SCN-882 | Medium | QAC | Supplier Packaging Defect Report | Defective roll logged | Click "Supplier Defect Claim" | Exports claim report with roll lot number and defect photo. | Verified |
| SCN-883 | Simple | OPR | Delete History Record Blocked | History row selected | Look for delete action | No delete button exists; history records are strictly append-only. | Verified |
| SCN-884 | Complex | MNT | Archiving Old History Records (> 1 Year) | Database maintenance | Click "Archive Records Older than 365 Days" | Moves aged records to read-only cold archive file; keeps active DB fast. | Verified |
| SCN-885 | Simple | MNT | Restore Archived History File | Settings | Upload cold archive JSON | Merges archived jobs back into view for historical audits. | Verified |
| SCN-886 | Simple | OPR | History Date Quick Filters: This Month | History view | Click "This Month" | Sets filter to 1st of current month to current date. | Verified |
| SCN-887 | Simple | OPR | History Date Quick Filters: Previous Month | History view | Click "Previous Month" | Sets filter to previous complete calendar month. | Verified |
| SCN-888 | Medium | PLN | Shift Handover History Report | End of Shift A (14:00) | Click "Generate Shift Report" | Summarizes total jobs, units, waste, and uptime during Shift A. | Verified |
| SCN-889 | Simple | OPR | Print Shift Report to Office Printer | Shift report open | Click "Print Report" | Formats clean A4 summary sheet for line supervisor sign-off. | Verified |
| SCN-890 | Complex | QAC | Batch Traceability Reverse Lookup | Retail pack returned with Job ID | Enter Job ID in search | Instantly reveals raw lot numbers, supplier, MFD, Best Before, and operator! | Verified |
| SCN-891 | Simple | OPR | High Contrast History Table Mode | Accessibility | Toggle High Contrast | Crisp black/white borders and distinct text weights. | Verified |
| SCN-892 | Medium | MNT | IndexedDB History Storage Metrics | Settings / Storage | Inspect history table size | Displays: "History: 1,420 records (2.8 MB stored)". | Verified |
| SCN-893 | Complex | MNT | Automatic History Pruning Advisory | Database > 50 MB | System check | Displays advisory recommending backup export before pruning old logs. | Verified |
| SCN-894 | Simple | OPR | History Search Auto-Clear | Search active | Click "X" in search box | Clears query and restores full table view instantly. | Verified |
| SCN-895 | Medium | PLN | Filter History by Dispatch Protocol | Filter dropdown | Select "Native TCP 9100" | Shows only jobs dispatched via RAW TCP sockets. | Verified |
| SCN-896 | Simple | OPR | Tooltip on Cryptographic Hash | Hover on hash | Tooltip appears | "SHA-256 hash generated at time of proof approval; verifies label integrity." | Verified |
| SCN-897 | Complex | QAC | ISO 9001 / FSSAI Audit Readiness Checklist | Quality audit | Run audit check | All history records conform to 21 CFR Part 11 / ISO 9001 electronic record rules. | Verified |
| SCN-898 | Simple | OPR | History Keyboard Navigation | Table active | Use `Up` / `Down` arrows | Navigates through history rows smoothly; highlights active row. | Verified |
| SCN-899 | Simple | OPR | History Row Selection Shortcut | Row highlighted | Press `Enter` | Opens Details modal for highlighted job immediately. | Verified |
| SCN-900 | Complex | PLN | Volume 9 History Milestone Check | End-to-end audit test | Dispatch job -> verify history -> reprint exact snapshot -> void test -> export CSV | 100% verified historical audit integrity. | Verified |
