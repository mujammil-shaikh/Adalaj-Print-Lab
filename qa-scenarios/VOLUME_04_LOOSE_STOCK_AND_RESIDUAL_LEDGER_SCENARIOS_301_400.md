# Volume 04 — Loose Stock & Residual Ledger (Scenarios 301 – 400)

**Domain:** Residual Material Policy, Loose Stock Inventory Ledger, Container & Bin IDs, Raw Lot Traceability, Scrap Thresholds, Allocation Draw, Zero Double-Counting  
**Target:** `https://adalaj-label-studio.vercel.app` & `src/components/batches/`, `src/types/`, `src/db/`

---

## 1. Residual Material Creation & Registration (SCN-301 – SCN-330)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-301 | Simple | OPR | Open Residual Stock Registration | Batch close or pause | Click "Register Loose Stock" | Opens modal with residual weight, source lot, and container fields. | Verified |
| SCN-302 | Medium | OPR | Capture Source Batch & Material Lot | Batch `ADTP-2026-001` active | Inspect auto-filled fields | Auto-fills source batch and raw material lot `LOT-RAW-TUR-8942`. | Verified |
| SCN-303 | Medium | OPR | Enter Residual Weight (kg) | Register modal open | Enter `18.45` kg | Converts to $18,450\text{ g}$; validates positive float. | Verified |
| SCN-304 | Simple | OPR | Assign Container / Drum ID | Register modal open | Enter `DRUM-TUR-04` | Assigns barcode-scannable container tracking ID. | Verified |
| SCN-305 | Medium | QAC | QA Release Status for Loose Stock | Register modal open | Select QA status "PENDING_INSPECTION" | Flags loose stock as quarantined until QA approval. | Verified |
| SCN-306 | Complex | QAC | Immediate QA Approval for Clean Hopper Residual | Residual from clean run | Toggle "QA Pre-cleared (Clean Hopper)" | Sets status immediately to `AVAILABLE` with inspector username. | Verified |
| SCN-307 | Simple | OPR | Record Storage Location / Bin | Register modal open | Select "Aisle 3 - Shelf B2" | Records warehouse physical coordinate. | Verified |
| SCN-308 | Medium | OPR | Auto-generate Loose Stock Lot ID | Product short code ADTP | Inspect Lot ID field | Generates format `LS-ADTP-2026-001-C1` uniquely. | Verified |
| SCN-309 | Complex | QAC | Enforce Original Lot Expiry Inheritance | Source batch expiry: 14 Jul 2026 | Save loose stock | Loose stock record inherits exact expiry date `14 Jul 2026`. Shelf life is NEVER refreshed! | Verified |
| SCN-310 | Simple | OPR | Save Loose Stock Record | Valid data entered | Click "Confirm & Store Loose Stock" | Saves record to `db.looseStock`; updates batch unallocated mass balance. | Verified |
| SCN-311 | Simple | OPR | View Loose Stock Ledger Table | Batches or Inventory tab | Click "Loose Stock Ledger" | Table displays: ID, Product, Weight, Source Batch, Container, Expiry, Status. | Verified |
| SCN-312 | Simple | OPR | Search Loose Stock by Product | Ledger visible | Type "Turmeric" in filter | Filters ledger to turmeric residual stock items. | Verified |
| SCN-313 | Simple | OPR | Search Loose Stock by Container ID | Ledger visible | Type "DRUM-TUR-04" | Immediately locates specific drum record. | Verified |
| SCN-314 | Medium | QAC | Filter Loose Stock by QA Status | Ledger visible | Select filter "AVAILABLE" | Displays only stock cleared for production blending. | Verified |
| SCN-315 | Medium | QAC | Filter Quarantined Loose Stock | Ledger visible | Select filter "PENDING_INSPECTION" | Shows drums requiring QA lab release testing. | Verified |
| SCN-316 | Complex | QAC | Approve Quarantined Drum | Drum `LS-ADTP-2026-001-C1` selected | Click "Approve Stock", enter test report `QC-TUR-901` | Updates status to `AVAILABLE`; appends QA approval audit record. | Verified |
| SCN-317 | Complex | QAC | Reject Quarantined Drum to Scrap | Drum contaminated | Click "Reject to Scrap", enter reason "Foreign particulate" | Transitions entire drum weight to scrap ledger (SCN-361). | Verified |
| SCN-318 | Simple | OPR | Print Loose Stock Drum Label | Drum record selected | Click "Print Drum Tag" | Generates 100x150mm barcode tag with drum ID, weight, lot, and expiry date. | Verified |
| SCN-319 | Medium | OPR | Scan Drum Tag Barcode | Print / Batch wizard open | Scan drum barcode with scanner | Automatically selects and inputs loose stock lot into batch builder. | Verified |
| SCN-320 | Complex | MNT | Prevent Negative Loose Stock Quantity | Edit drum modal | Attempt to enter `-5` kg | Form blocks submission with validation error: "Weight must be greater than zero". | Verified |
| SCN-321 | Medium | OPR | Weighing Tolerance Check | Registered: 18.45 kg, scale reads 18.40 kg | Tolerance threshold 100g | 50g variance is within tolerance; logs variance without blocking. | Verified |
| SCN-322 | Complex | QAC | Weighing Tolerance Exceeded Alert | Scale reads 17.50 kg (950g variance) | Attempt draw | System raises alert: "Scale reading differs from recorded drum weight by 950g. Re-taring required." | Verified |
| SCN-323 | Simple | OPR | Add Operator Notes to Drum | Drum details open | Enter note: "Fine mesh sifted before drumming" | Saves note permanently to drum provenance history. | Verified |
| SCN-324 | Medium | PLN | Total Loose Stock Weight KPI Card | Batches dashboard | Observe "Loose Stock in Hand" KPI | Aggregates all `AVAILABLE` loose stock mass into single live metric. | Verified |
| SCN-325 | Simple | PLN | Loose Stock Value Estimation | 50 kg turmeric loose stock at ₹45/kg | Observe value column | Displays estimated material value ₹2,250. | Verified |
| SCN-326 | Complex | QAC | Near-Expiry Loose Stock Flag | Drum expires in 15 days | View ledger row | Amber badge: "Expiring Soon — Priority Blending Recommended". | Verified |
| SCN-327 | Complex | QAC | Auto-quarantine on Expiration | Drum passes Best Before date | System daily cron / load check | Status auto-transitions from `AVAILABLE` to `EXPIRED`; blocks allocation. | Verified |
| SCN-328 | Medium | PLN | Loose Stock Export to CSV | Ledger view | Click "Export Loose Stock (CSV)" | Downloads full ledger with container, lot, and weight breakdown. | Verified |
| SCN-329 | Simple | OPR | Empty Loose Stock Ledger State | Fresh database with 0 loose stock | View ledger | Displays empty state illustration: "No loose stock recorded yet. Residuals from completed batches appear here." | Verified |
| SCN-330 | Medium | QAC | Container Re-assignment | Container damaged | Transfer 18.45kg to `DRUM-TUR-09` | Updates container ID while preserving original lot ID and expiry date. | Verified |

---

## 2. Loose Stock Allocation & Blending (SCN-331 – SCN-360)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-331 | Simple | PLN | Draw Loose Stock into New Batch | Batch Wizard Step 2 open | Click "+ Ingest Loose Stock" | Opens drawer listing available loose stock for selected product. | Verified |
| SCN-332 | Medium | PLN | Filter Ingest Options by Matching Product | Product is Turmeric Powder | Open Ingest drawer | Only displays turmeric loose stock; filters out other products automatically. | Verified |
| SCN-333 | Medium | PLN | Select Drum for Full Allocation | Drum has 18.45 kg available | Click "Allocate Full Drum" | Deducts 18.45 kg from loose stock; adds 18.45 kg to batch raw material input. | Verified |
| SCN-334 | Complex | PLN | Partial Drum Allocation | Drum has 50.00 kg available | Enter draw quantity `20.00` kg | Allocates 20 kg to batch; updates drum remaining balance to `30.00 kg`. | Verified |
| SCN-335 | Complex | PLN | Zero Double-Counting Guarantee | Drum has 20 kg remaining | Inspect global inventory | Total raw in hand shows 20 kg loose stock + 20 kg in active batch. No duplicate mass created! | Verified |
| SCN-336 | Medium | PLN | Deplete Drum to Zero Balance | Drum balance: 5.0 kg | Allocate 5.0 kg to batch | Drum remaining balance becomes `0.00 kg`; status auto-transitions to `DEPLETED`. | Verified |
| SCN-337 | Simple | PLN | Depleted Drums Filter | Ledger visible | Check "Show Depleted Drums" | Displays depleted drums with zero balance and depletion timestamp. | Verified |
| SCN-338 | Complex | QAC | Multi-Source Traceability in Batch Traveler | Batch used 100kg fresh raw + 18.45kg loose stock | Generate traveler | Traveler lists both fresh lot `LOT-RAW-TUR-8942` and loose lot `LS-ADTP-2026-001-C1`. | Verified |
| SCN-339 | Complex | QAC | Expiry Clamping on Blended Batches | Fresh raw exp: Nov 2027, Loose stock exp: Jul 2026 | Calculate batch Best Before | System enforces Earliest Expiry Rule: Blended batch Best Before clamped to `14 Jul 2026`. | Verified |
| SCN-340 | Complex | QAC | Blended Batch Expiry Override Alert | Operator attempts to set expiry to Nov 2027 | Submit batch | Blocked: "Batch contains loose stock expiring 14 Jul 2026. Batch expiry cannot exceed constituent components." | Verified |
| SCN-341 | Medium | PLN | Remove Allocated Drum from Draft Batch | Drum allocated in Step 2 | Click "Remove Allocation" | Restores drum balance in loose stock ledger; recalculates batch mass. | Verified |
| SCN-342 | Complex | PLN | Cancel Batch Wizard with Active Allocations | 2 drums partially drawn | Click "Cancel Wizard" | System rolls back all tentative reservations; restores original drum balances. | Verified |
| SCN-343 | Medium | PLN | FIFO Allocation Suggestion | 3 drums available with different dates | Open Ingest drawer | System highlights oldest drum first according to First-In-First-Out rule. | Verified |
| SCN-344 | Medium | QAC | FEFO Allocation Suggestion | Drums with different Best Before dates | Open Ingest drawer | System sorts by First-Expired-First-Out to prioritize minimizing waste. | Verified |
| SCN-345 | Complex | PLN | Blending Ratio Constraint Check | Production spec: max 15% loose blend | Batch planned: 100 kg, loose drawn: 25 kg | System flags warning: "Loose blend is 25%, exceeding recommended 15% quality threshold." | Verified |
| SCN-346 | Medium | QAC | Manager Approval for High Blend Ratio | High blend warning visible | QA Manager enters approval notes | Permits batch creation with explicit quality sign-off. | Verified |
| SCN-347 | Simple | OPR | View Drum Draw History | Drum details modal | Click "Allocation History" | Lists all batches that consumed material from this drum with dates and operators. | Verified |
| SCN-348 | Medium | PLN | Concurrent Batch Allocation Lock | Two operators open batch builder simultaneously | Operator A allocates Drum 04 | Operator B sees Drum 04 update to "Reserved in Draft Batch #005". | Verified |
| SCN-349 | Simple | OPR | Return Material from Cancelled Run | Production cancelled after 5kg hopper feed | Open Residual modal | Cleanly returns 5kg back to loose stock under new return ledger entry. | Verified |
| SCN-350 | Complex | MNT | Database Rollback on Transaction Crash | Browser tab crashes during allocation save | Reopen application | IndexedDB transaction atomicity preserves accurate drum balances without corruption. | Verified |
| SCN-351 | Simple | PLN | Loose Stock Draw Summary in Batch Card | Batches view | Inspect batch card | Shows badge: "Includes 18.5kg Loose Stock (2 Lots)". | Verified |
| SCN-352 | Medium | OPR | Drum Tare Weight Verification | Drum gross: 23.45 kg, tare: 5.0 kg | Verify net powder | System computes net: $23.45 - 5.0 = 18.45\text{ kg}$. | Verified |
| SCN-353 | Complex | QAC | Contamination Quarantine of Parent Lot | Raw Lot 8942 recalled | Quarantine parent lot | System queries and automatically places all derived loose stock drums on QUARANTINE hold! | Verified |
| SCN-354 | Simple | PLN | Bulk Loose Stock Draw | 5 small residual canisters | Click "Merge & Draw" | Aggregates 5 canisters into single consolidated batch allocation line. | Verified |
| SCN-355 | Medium | OPR | Quick Scan to Allocate | Drum barcode on table | Click "Scan to Ingest", scan barcode | Directly attaches drum to current draft batch in 1 step. | Verified |
| SCN-356 | Complex | QAC | Cross-Product Blending Prevention | Turmeric batch open | Attempt to scan Coriander loose drum | System rejects scan: "Product mismatch: Cannot blend Coriander stock into Turmeric batch." | Verified |
| SCN-357 | Simple | PLN | Ingest Drawer Search & Filter | Ingest drawer open | Type drum number | Instant filter response with zero UI stutter. | Verified |
| SCN-358 | Medium | PLN | Loose Stock Stocktake / Physical Count Reconciliation | Monthly stocktake | Enter physical count 18.2kg for drum | Records 0.25kg weighing adjustment with reason "Scale variance". | Verified |
| SCN-359 | Simple | OPR | Loose Stock Container Label Reprint | Barcode smudged | Click "Reprint Tag" | Outputs clean, high-contrast ZPL/TSPL drum tag. | Verified |
| SCN-360 | Complex | PLN | Allocation Ledger Audit Trail Verification | Batch closed | Inspect DB table `loose_stock_ledger` | Records every debit, credit, timestamp, and user ID without gaps. | Verified |

---

## 3. Scrapping, Process Loss & Disposal Governance (SCN-361 – SCN-400)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-361 | Simple | OPR | Open Scrap Material Modal | Batches or Loose Stock view | Click "Scrap Material" | Opens scrap declaration modal. | Verified |
| SCN-362 | Medium | OPR | Select Scrap Source | Scrap modal open | Select "From Active Batch" or "From Loose Drum" | Form adapts to prompt for relevant source ID. | Verified |
| SCN-363 | Medium | OPR | Enter Scrap Weight | Modal open | Enter `4.2` kg | Records scrap mass in kg and grams. | Verified |
| SCN-364 | Simple | OPR | Select Scrap Reason Category | Modal open | Choose dropdown "Line Flush / Startup Waste" | Categorizes loss for OEE reporting. | Verified |
| SCN-365 | Simple | OPR | Scrap Reason: Foreign Matter / Contamination | Modal open | Choose "Foreign Matter" | Requires entering inspection notes before saving. | Verified |
| SCN-366 | Simple | OPR | Scrap Reason: Expired Material | Modal open | Choose "Expired Material" | Auto-links to batch expiration date. | Verified |
| SCN-367 | Simple | OPR | Scrap Reason: Machine Jam / Spill | Modal open | Choose "Spillage" | Flags maintenance/operational root cause. | Verified |
| SCN-368 | Complex | QAC | Scrap Threshold Alert (> 5 kg) | Scrap weight entered: 12.5 kg | Observe validation | Warning: "Scrap exceeds 5 kg threshold. Requires Quality Supervisor authorization." | Verified |
| SCN-369 | Complex | QAC | Quality Supervisor Scrap Sign-Off | Alert active | Supervisor enters PIN and approves | Records supervisor ID and timestamp on scrap authorization record. | Verified |
| SCN-370 | Simple | OPR | Save Scrap Declaration | Valid form | Click "Confirm Scrap" | Deducts mass from active inventory; creates entry in `db.scrapLedger`. | Verified |
| SCN-371 | Simple | PLN | View Scrap History Ledger | Batches / Reports | Click "Process Loss & Scrap Ledger" | Displays table of all scrap events with source, weight, reason, and authorized user. | Verified |
| SCN-372 | Medium | PLN | Scrap by Reason Breakdown Chart | Scrap ledger open | Inspect donut chart | Visualizes percentage breakdown: Spillage (40%), Line Flush (35%), Expired (25%). | Verified |
| SCN-373 | Medium | PLN | Filter Scrap by Date Range | Scrap ledger open | Filter current month | Summarizes total scrap mass for the month (e.g. 84.6 kg). | Verified |
| SCN-374 | Complex | QAC | Process Loss Percentage Calculation | Total raw: 5,000 kg, Total scrap: 62 kg | View KPI | Displays overall process loss rate: $1.24\%$ ($\le 2.0\%$ target green indicator). | Verified |
| SCN-375 | Complex | QAC | Loss Rate Exceeds Target KPI Warning | Loss rate: 3.8% (> 2.0% SLA) | View KPI | Badge turns Red: "Process loss rate exceeded SLA limit by 1.8%". | Verified |
| SCN-376 | Simple | OPR | Scrap Drum with Zero Usable Residue | Residual drum has 1.2kg dried caking | Click "Scrap Entire Drum" | Transitions drum status to `SCRAPPED`; balance set to 0. | Verified |
| SCN-377 | Simple | OPR | Disposal Certificate Generation | Hazardous or regulated disposal | Click "Generate Disposal Manifest" | Generates PDF manifest for industrial waste contractor sign-off. | Verified |
| SCN-378 | Medium | PLN | Monthly Scrap Reconciliation Report | Month end | Click "Monthly Scrap Export" | Exports comprehensive CSV breakdown for cost accounting. | Verified |
| SCN-379 | Complex | MNT | Prevent Deletion of Scrap Records | Scrap record in table | Inspect actions | No "Delete" button exists; scrap audit records are write-once, immutable. | Verified |
| SCN-380 | Medium | QAC | Correct Erroneous Scrap Weight | Weight entered 50kg instead of 5kg | Click "Issue Correction" | Creates correcting credit entry with supervisor justification note; never deletes original entry. | Verified |
| SCN-381 | Simple | OPR | Weighing Scale Integration for Scrap | Digital scale attached | Click "Read Scale" | Reads tare-adjusted weight directly from serial/WebUSB scale. | Verified |
| SCN-382 | Simple | PLN | Search Scrap Records by Batch ID | Scrap ledger | Type "ADTP-2026-001" | Shows all scrap events originating from that specific batch. | Verified |
| SCN-383 | Medium | QAC | Audit Trace from Scrap to Raw Lot | Scrap record selected | Click "Trace to Raw Material" | Resolves scrap entry back to original vendor raw material lot. | Verified |
| SCN-384 | Simple | OPR | Tag Scrapped Container for Disposal | Drum scrapped | Click "Print Hazardous / Waste Tag" | Prints high-visibility yellow waste tag. | Verified |
| SCN-385 | Complex | PLN | Mass Balance Reconciliation Gate | Batch close | System checks: $\text{Raw} - \text{Packs} - \text{Loose} - \text{Scrap}$ | Any difference $> 200\text{g}$ forces operator to declare unexplained variance. | Verified |
| SCN-386 | Simple | OPR | Unaccounted Variance Declaration | Variance is 120g | Select "Dust extraction loss" | Resolves mass balance equation to 100% equilibrium. | Verified |
| SCN-387 | Medium | PLN | Material Loss Financial Costing | 15 kg scrapped at ₹40/kg standard cost | View scrap report | Displays cost of scrap: ₹600. | Verified |
| SCN-388 | Complex | QAC | Scrap Root Cause Tagging | Scrap modal | Add root cause tag "Nozzle Overheating" | Tags maintenance team for machine inspection. | Verified |
| SCN-389 | Simple | OPR | Cancel Scrap Dialog | Modal open | Click "Cancel" | Form closes without mutating ledger records. | Verified |
| SCN-390 | Medium | PLN | Scrap Trend Over Time Chart | Reports view | Select 6-month view | Plots monthly scrap trend line showing continuous reduction. | Verified |
| SCN-391 | Simple | OPR | High-contrast waste reason icons | Scrap selection | View options | Distinct visual icons for Spill, Spoilage, Calibration, and Flush. | Verified |
| SCN-392 | Complex | QAC | Automatic Scrap Alert Email / Webhook | High-loss event recorded | System trigger | Fires webhook payload to plant quality management system. | Verified |
| SCN-393 | Simple | PLN | Scrap Ledger Mobile Responsive Layout | View on 375px mobile | Open scrap ledger | Table switches to stacked card view; fully readable without horizontal cutoffs. | Verified |
| SCN-394 | Medium | OPR | Quick-Scrap Shortcut Key | Batches view | Press `Alt+S` | Directly triggers Scrap Material modal from anywhere in Batches view. | Verified |
| SCN-395 | Complex | MNT | Offline Scrap Recording | Internet disconnected | Record scrap entry | Saved to local IndexedDB; syncs cleanly when back online. | Verified |
| SCN-396 | Simple | QAC | Filter Scrap by Shift | Scrap ledger | Filter "Shift A" | Displays only losses recorded during morning shift. | Verified |
| SCN-397 | Medium | PLN | Product Scrap Pareto Analysis | Reports view | Open Pareto chart | Highlights products responsible for 80% of factory material loss. | Verified |
| SCN-398 | Simple | OPR | Bulk Drum Scrapping | 3 expired test drums | Check all 3, click "Scrap Selected" | Scraps all 3 drums in single transaction with consolidated disposal ID. | Verified |
| SCN-399 | Complex | QAC | Regulatory Compliance Check | Food safety audit | Export ledger | Meets FSSAI and ISO 22000 mass balance and traceability requirements. | Verified |
| SCN-400 | Complex | PLN | Volume 4 Loose Stock Milestone Check | Full ledger cycle | Register 25kg, draw 15kg to batch, scrap 10kg, verify 0 balance | 100% mass balance precision verified with zero double-counting. | Verified |
