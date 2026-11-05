# Volume 03 — Batch Planning & Mass Balance (Scenarios 201 – 300)

**Domain:** Batch Planning Wizard, Auto-Sequential Batch Codes, Mass Balance Engine, Raw Material Lots, Expiry Date Math (Clamped Anniversary Minus 1 Day), Status Lifecycle  
**Target:** `https://adalaj-print-lab.vercel.app` & `src/components/batches/BatchesView.tsx`, `src/utils/dateCalculations.ts`, `src/types/`

---

## 1. Batch Creation & Sequential Numbering (SCN-201 – SCN-230)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-201 | Simple | PLN | Open New Batch Wizard | On Batches view | Click "+ New Batch" button or press `Alt+N` | New Batch creation modal opens with step-by-step wizard. | Verified |
| SCN-202 | Simple | PLN | Select Product for Batch | Wizard Step 1 open | Choose "Turmeric Powder" from dropdown | Auto-populates batch code prefix `ADTP-` and default shelf life (12 mo). | Verified |
| SCN-203 | Medium | PLN | Auto-generate Sequential Batch Number | Turmeric selected, prior batch ADTP-2026-004 | Inspect generated batch ID | Proposes `ADTP-2026-005` automatically from highest sequential index. | Verified |
| SCN-204 | Medium | PLN | Custom Batch Number Override | Auto-number generated | Type "ADTP-2026-EXP-01" | Allows manual override if allowed by operator permissions. | Verified |
| SCN-205 | Complex | QAC | Prevent Duplicate Batch Code | Batch `ADTP-2026-001` exists | Enter `ADTP-2026-001` in batch ID field | Validation error flags duplicate batch code and blocks proceeding to Step 2. | Verified |
| SCN-206 | Simple | PLN | Set Manufacturing Date (MFD) | Wizard Step 1 | Select date picker "15 Jan 2026" | Sets MFD; triggers reactive Best Before calculation. | Verified |
| SCN-207 | Simple | PLN | Default MFD to Today | Wizard Step 1 open fresh | Observe default MFD field | Pre-populates with current local calendar date (YYYY-MM-DD). | Verified |
| SCN-208 | Medium | PLN | Prevent Future MFD Beyond Grace Window | Production rules active | Attempt to select MFD 90 days in future | Warning flags excessive future manufacturing date. | Verified |
| SCN-209 | Simple | PLN | Select Line / Machine Profile | Wizard Step 1 | Select "Station 1 - Markem-Imaje 9040" | Binds batch to line capabilities (e.g. 150 DPI, CIJ speed). | Verified |
| SCN-210 | Medium | PLN | Enter Planned Raw Material Weight | Wizard Step 2 (Mass Balance) | Enter `500.00` kg | Sets total planned raw mass to 500,000 grams. | Verified |
| SCN-211 | Medium | PLN | Assign Raw Material Lot ID | Wizard Step 2 | Enter `LOT-RAW-TUR-8942` | Binds lot ID for upstream farm/grinding traceability. | Verified |
| SCN-212 | Complex | PLN | Multi-Lot Ingestion | Wizard Step 2 | Click "+ Add Ingested Lot", enter `LOT-RAW-TUR-8943` (200kg) | Multiple lot IDs tracked and merged into batch provenance ledger. | Verified |
| SCN-213 | Simple | PLN | Add Target SKU to Batch Plan | Wizard Step 3 (Pack Allocations) | Select "100 g Pouch" | Adds 100 g SKU row to allocation table. | Verified |
| SCN-214 | Medium | PLN | Allocate Target Pack Count | 100 g row added | Enter planned units `2,000` | Calculates planned mass: $2,000 \times 100\text{ g} = 200,000\text{ g}$ ($200\text{ kg}$). | Verified |
| SCN-215 | Medium | PLN | Allocate Second SKU (500 g) | Wizard Step 3 | Add "500 g Pouch", enter `500` units | Calculates planned mass: $500 \times 500\text{ g} = 250,000\text{ g}$ ($250\text{ kg}$). | Verified |
| SCN-216 | Medium | PLN | Real-time Mass Balance Gauge | Total raw: 500 kg, Allocations: 450 kg | Observe balance summary bar | Shows 450 kg allocated (90%), 50 kg unallocated (10%). | Verified |
| SCN-217 | Complex | PLN | Over-allocation Warning | Total raw: 500 kg | Enter 3,500 units of 100g (350kg) + 500 units of 500g (250kg) = 600kg | Summary flags red: "Allocated mass (600 kg) exceeds raw material (500 kg) by 100 kg". | Verified |
| SCN-218 | Medium | PLN | Process Loss / Scrap Estimation | Step 2 / 3 | Enter planned scrap allowance 2.5% (12.5 kg) | Deducts allowance from available mass; unallocated adjusts to 37.5 kg. | Verified |
| SCN-219 | Simple | PLN | Step Back in Wizard | Wizard on Step 3 | Click "Back" button | Returns to Step 2 preserving all entered raw lots and weights. | Verified |
| SCN-220 | Simple | PLN | Cancel Batch Creation | Wizard open | Click "Cancel" | Closes modal without saving orphan records. | Verified |
| SCN-221 | Complex | PLN | Finalize Batch Creation | Steps 1-3 complete & balanced | Click "Create Batch Plan" | Batch saved to IndexedDB `db.batches` with status `PLANNED`; audit log recorded. | Verified |
| SCN-222 | Simple | OPR | View Batches List | Batches view loaded | Observe table | Displays all batches with Batch ID, Product, MFD, Best Before, Planned Mass, Status badge. | Verified |
| SCN-223 | Simple | OPR | Filter Batches by Status | Batches view | Click "PLANNED" pill filter | Filters table to only show planned batches awaiting release. | Verified |
| SCN-224 | Simple | OPR | Filter Batches by Product | Batches view | Select "Coriander Powder" in product filter | Shows only ADCP batches. | Verified |
| SCN-225 | Simple | OPR | Search Batch by Batch ID | Batches view | Type "2026-003" in search | Filters table to matched batch instantly. | Verified |
| SCN-226 | Medium | PLN | Edit Planned Batch Details | Batch in `PLANNED` status | Click "Edit Batch" | Opens edit modal; allows altering target unit allocations. | Verified |
| SCN-227 | Complex | QAC | Prevent Editing Running Batch | Batch in `RUNNING` status | Inspect actions menu | "Edit Details" is disabled; displays "Cannot edit batch during active production". | Verified |
| SCN-228 | Medium | PLN | Clone Existing Batch | Select existing batch | Click "Duplicate Plan" | Pre-populates wizard with identical SKUs and ratios with new sequential batch ID. | Verified |
| SCN-229 | Medium | PLN | Delete Draft Planned Batch | Batch in `PLANNED` with 0 prints | Click "Delete", confirm warning | Deletes batch record and associated unprinted allocation records. | Verified |
| SCN-230 | Complex | QAC | Disallow Deletion of Batch with Print History | Batch has 150 labels printed | Attempt to delete | Action forbidden; error: "Batches with recorded print jobs cannot be deleted; use Close instead." | Verified |

---

## 2. Expiry & Shelf-Life Calculation (Clamped Anniversary - 1 Day) (SCN-231 – SCN-260)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-231 | Simple | QAC | Standard Expiry: 6 Months from Mid-Month | MFD: `15 Jan 2026`, Shelf life: 6 mo | Compute Best Before | Displays `14 Jul 2026` ($15\text{ Jan} + 6\text{ months} - 1\text{ day}$). | Verified |
| SCN-232 | Medium | QAC | Month-End Clamping: 31 Jan with 1 Month Shelf Life | MFD: `31 Jan 2026`, Shelf life: 1 mo | Compute Best Before | Target month is Feb (28 days in 2026). Clamps to 28 Feb minus 1 day = `27 Feb 2026`. Never overflows to March! | Verified |
| SCN-233 | Medium | QAC | Month-End Clamping: 31 Aug with 6 Months Shelf Life | MFD: `31 Aug 2026`, Shelf life: 6 mo | Compute Best Before | Target month is Feb 2027. Clamps to 28 Feb 2027 minus 1 day = `27 Feb 2027`. | Verified |
| SCN-234 | Simple | QAC | Full Year Expiry: 12 Months | MFD: `15 Nov 2026`, Shelf life: 12 mo | Compute Best Before | Displays `14 Nov 2027`. | Verified |
| SCN-235 | Complex | QAC | Leap Year Clamping: 29 Feb MFD with 12 Months | MFD: `29 Feb 2024`, Shelf life: 12 mo | Compute Best Before | Feb 2025 has 28 days. Clamps to 28 Feb minus 1 day = `27 Feb 2025`. | Verified |
| SCN-236 | Complex | QAC | Leap Year Target: 31 Aug 2023 with 6 Months | MFD: `31 Aug 2023`, Shelf life: 6 mo | Compute Best Before | Target month is Feb 2024 (leap year, 29 days). Result: `28 Feb 2024`. | Verified |
| SCN-237 | Simple | QAC | Day 1 of Month MFD: 01 Mar 2026 with 1 Month | MFD: `01 Mar 2026`, Shelf life: 1 mo | Compute Best Before | March 1 + 1 mo = April 1. Minus 1 day = `31 Mar 2026`. | Verified |
| SCN-238 | Simple | QAC | Day 1 of Month MFD: 01 Jan 2026 with 12 Months | MFD: `01 Jan 2026`, Shelf life: 12 mo | Compute Best Before | Jan 1 + 12 mo = Jan 1 2027. Minus 1 day = `31 Dec 2026`. | Verified |
| SCN-239 | Medium | QAC | Shelf Life 24 Months Calculation | MFD: `10 May 2026`, Shelf life: 24 mo | Compute Best Before | Displays `09 May 2028`. | Verified |
| SCN-240 | Medium | QAC | Shelf Life 36 Months Calculation | MFD: `05 Jun 2026`, Shelf life: 36 mo | Compute Best Before | Displays `04 Jun 2029`. | Verified |
| SCN-241 | Complex | QAC | Rejection of Silent Month-End Rounding | MFD: `15 Jan 2026`, Shelf life: 6 mo | Inspect UI and token values | Confirms output is strictly `14/07/2026`, NEVER rounded up to `31/07/2026`. | Verified |
| SCN-242 | Medium | PLN | Batch Date vs SKU Override Date | Product shelf life 12 mo, 100g SKU override 6 mo | Select 100g SKU in batch | Label preview calculates Best Before using 6 months (`14 Jul 2026`), overriding 12 months. | Verified |
| SCN-243 | Simple | OPR | Dynamic Date Formatting: DD/MM/YYYY | Best Before `14 Jul 2026` | Select format `DD/MM/YYYY` | Formats as `14/07/2026`. | Verified |
| SCN-244 | Simple | OPR | Dynamic Date Formatting: DD-MMM-YYYY | Best Before `14 Jul 2026` | Select format `DD-MMM-YYYY` | Formats as `14-JUL-2026`. | Verified |
| SCN-245 | Simple | OPR | Dynamic Date Formatting: MM/YY | Best Before `14 Jul 2026` | Select format `MM/YY` | Formats as `07/26`. | Verified |
| SCN-246 | Medium | OPR | Dynamic Date Formatting: Best Before Date Only | Template has `BEST_BEFORE_DATE` token | Render label | Resolves token to clamped anniversary date string accurately. | Verified |
| SCN-247 | Complex | QAC | Consistency Check: Batch View vs Print vs History | Any batch with clamped date | Compare date across 3 views | Date value matches identically to the exact day across all 3 components. | Verified |
| SCN-248 | Simple | PLN | Short Shelf Life (15 Days) Support | Specialty product | Set shelf life to 15 days | Calculates $MFD + 15\text{ days} - 1\text{ day}$. | Verified |
| SCN-249 | Medium | PLN | Past MFD Validation | MFD set to 6 months ago | Observe warning banner | Yellow caution indicator: "MFD is in the past. Ensure this matches physical packaging run." | Verified |
| SCN-250 | Complex | QAC | Unit Test Verification for `calculateBestBefore` | Run test suite | Check test assertions in `dateCalculations.test.ts` | All 8 boundary edge cases pass with 100% green status. | Verified |
| SCN-251 | Simple | PLN | Expiry Notice on Batches Table | Batch expiring in < 30 days | Observe status column | Amber badge: "Expiring Soon". | Verified |
| SCN-252 | Simple | PLN | Expired Batch Highlighting | Best Before < Current Date | Observe status column | Red badge: "Expired". | Verified |
| SCN-253 | Complex | QAC | Block Print on Expired Batch | Expired batch selected | Click "Open in Print Center" | Warning modal: "This batch is expired. Reprints require Quality Manager PIN authorization." | Verified |
| SCN-254 | Medium | QAC | Override Expired Batch for Sample Reprints | Manager enters PIN | Confirm authorization | Logs quality bypass in audit trail and permits specimen print. | Verified |
| SCN-255 | Simple | PLN | Export Batch Expiry Schedule | Batches view | Click "Export Schedule (CSV)" | Generates CSV with Batch ID, MFD, Best Before, and Days to Expiry. | Verified |
| SCN-256 | Simple | PLN | Batch Date Tooltip | Hover on Best Before date | Tooltip appears | "Calculated as MFD + 12 months - 1 day (Clamped Anniversary)". | Verified |
| SCN-257 | Medium | PLN | Bulk MFD Update for Draft Batches | 3 draft batches selected | Click "Update MFD", select tomorrow | Recalculates Best Before dates across all 3 batches in single transaction. | Verified |
| SCN-258 | Complex | PLN | Daylight Savings Immunity | Calculate date across DST boundary | Observe output | UTC date arithmetic ensures exactly $N$ months minus 1 calendar day, unaffected by clock shifts. | Verified |
| SCN-259 | Simple | PLN | Leap Year 2028 Planning | Set MFD 29 Feb 2028, 12 mo | Check Best Before | Outputs `27 Feb 2029`. | Verified |
| SCN-260 | Medium | QAC | Expiry Engine Zero-Leak Assurance | Session memory inspection | Perform 100 date calculations | No detached DOM nodes or memory leaks in worker thread. | Verified |

---

## 3. Mass Balance & Production Yield Tracking (SCN-261 – SCN-300)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-261 | Simple | OPR | View Batch Mass Balance Card | Batches view, batch selected | Open "Mass Balance" tab | Shows visual progress bar: Input Raw vs Output Finished Goods vs Residual vs Scrap. | Verified |
| SCN-262 | Medium | OPR | Record Actual Units Printed | Batch `ADTP-2026-001` running | Print 1,500 units of 100g | Consumed mass increments by $150\text{ kg}$ in active batch ledger. | Verified |
| SCN-263 | Medium | OPR | Reconcile Physical vs Theoretical Yield | Planned: 2,000 units, Actual: 1,980 units | Complete SKU run | Yield calculates to $99.0\%$ ($198\text{ kg} / 200\text{ kg}$). | Verified |
| SCN-264 | Complex | QAC | Tolerance Alert: Yield Under 95% | Actual yield: 92.4% | Enter production totals | Warning banner: "Yield variance exceeds 5% threshold. Operator comment required." | Verified |
| SCN-265 | Medium | OPR | Submit Yield Variance Reason | Low yield alert visible | Select "Spillage during hopper changeover" | Comment bound to batch closure record. | Verified |
| SCN-266 | Complex | QAC | Yield Over 101% Warning (Moisture / Scale Drift) | Actual weight > theoretical raw | Enter 2,050 units printed | Alert: "Finished mass exceeds raw mass by 5 kg. Suspected scale calibration error or ambient moisture gain." | Verified |
| SCN-267 | Medium | OPR | Real-time Mass Balance Gauge during Print | Live Print Center running | Observe batch progress widget | Updates remaining mass dynamically as each label finishes dispatch. | Verified |
| SCN-268 | Simple | OPR | Mark Batch Status as IN_PROGRESS | Batch in `PLANNED` | First label dispatched | Batch status auto-transitions to `IN_PROGRESS`; start timestamp recorded. | Verified |
| SCN-269 | Medium | OPR | Pause Batch Production | Batch `IN_PROGRESS` | Click "Pause Run" | Status transitions to `PAUSED`; pauses active speed counters. | Verified |
| SCN-270 | Medium | OPR | Resume Batch Production | Batch `PAUSED` | Click "Resume Run" | Status returns to `IN_PROGRESS`. | Verified |
| SCN-271 | Complex | PLN | Multi-SKU Mass Consumption Ledger | Batch has 100g, 250g, and 1kg targets | View breakdown table | Displays consumed mass and remaining quota per SKU independently. | Verified |
| SCN-272 | Medium | OPR | Partial Batch Closure | Production stopped early | Click "Close Batch" | Opens Close Batch Wizard with Residual & Scrap reconciliation. | Verified |
| SCN-273 | Complex | OPR | Record Residual Loose Material | 42.5 kg powder left in hopper | Enter `42.5` kg in "Reusable Residual Stock" | Routes quantity to Loose Stock Ledger with container ID (SCN-301). | Verified |
| SCN-274 | Complex | OPR | Record Unusable Process Scrap | 3.2 kg scorched/contaminated powder | Enter `3.2` kg in "Process Scrap" | Scraps quantity; updates total process loss to $3.2\text{ kg}$ ($0.64\%$). | Verified |
| SCN-275 | Complex | QAC | Mass Balance Equation Validation | Closure modal open | System verifies: $\text{Raw Mass} = \text{Finished Goods} + \text{Residual} + \text{Scrap} + \text{Unaccounted}$ | If unaccounted $> 0.5\text{ kg}$, requires supervisor sign-off. | Verified |
| SCN-276 | Simple | OPR | Close Batch Officially | Mass balance reconciled | Click "Confirm & Close Batch" | Status becomes `COMPLETED`; locks batch from further routine printing. | Verified |
| SCN-277 | Medium | QAC | Generate Batch Certificate of Manufacture | Batch completed | Click "Print Batch Summary PDF" | Downloads PDF report with lot provenance, mass balance chart, and operator signatures. | Verified |
| SCN-278 | Simple | OPR | View Closed Batches History | Batches view | Filter by `COMPLETED` | Displays historical completed batches. | Verified |
| SCN-279 | Medium | PLN | Reopen Closed Batch (Admin Only) | Completed batch selected | Admin clicks "Reopen Batch" | Prompts for justification reason; restores batch to `IN_PROGRESS`. | Verified |
| SCN-280 | Complex | MNT | Batch Integrity Check on Reload | Browser page refreshed mid-run | Reload page | Restores exact printed count and mass balance state from IndexedDB without loss. | Verified |
| SCN-281 | Simple | PLN | Batch Progress Percentage Bar | 1,200 of 2,000 units done | View batch row | Displays 60% progress bar in primary blue. | Verified |
| SCN-282 | Simple | PLN | Batch Remaining Unit Count | 1,200 of 2,000 done | Hover progress bar | Tooltip: "800 units remaining (80 kg)". | Verified |
| SCN-283 | Medium | PLN | Batch Target Completion Estimator | Current rate: 30 ppm | View estimated finish | Displays "Estimated completion in 26 minutes". | Verified |
| SCN-284 | Complex | PLN | Dynamic SKU Reallocation | Raw material unallocated | Add new pack size (2 kg) to running batch | Appends SKU row and updates mass balance without interrupting active prints. | Verified |
| SCN-285 | Medium | QAC | Traceability Tree View | Batch details modal | Click "Traceability" | Renders graph connecting Raw Lot -> Batch -> SKUs -> Dispatched Print Jobs. | Verified |
| SCN-286 | Simple | OPR | Batch Notes & Shift Log | Batch details open | Add shift note: "Shift B operator changeover at 14:00" | Saves note with operator username and timestamp. | Verified |
| SCN-287 | Medium | PLN | Filter Batches by Date Range | Batches view | Set range `01 Jan 2026` to `31 Jan 2026` | Shows batches manufactured within January. | Verified |
| SCN-288 | Simple | PLN | Clear Batches Filter | Active filters applied | Click "Reset Filters" | Restores full batch list view. | Verified |
| SCN-289 | Complex | MNT | Batch Data Export to JSON | Batches view | Click "Export Batches (JSON)" | Downloads compliant JSON backup containing batches, lots, and allocations. | Verified |
| SCN-290 | Complex | MNT | Batch Data Import from JSON | Settings / Batches | Upload JSON batch file | Validates schema and upserts batches into local IndexedDB. | Verified |
| SCN-291 | Simple | OPR | High-contrast status badges | Batches table | Inspect badges | PLANNED (Slate), RUNNING (Emerald pulsing), PAUSED (Amber), COMPLETED (Blue), ARCHIVED (Gray). | Verified |
| SCN-292 | Medium | OPR | Fast Batch Switcher | Print Center open | Use dropdown to switch batch | Immediately syncs active template, MFD, and batch number without page reload. | Verified |
| SCN-293 | Complex | QAC | Batch Lot Expiry Warning | Raw lot has earlier expiry than finished goods | Check Step 2 validation | Flags warning: "Raw Lot LOT-8942 expires before finished goods Best Before date!" | Verified |
| SCN-294 | Simple | PLN | Zero Quantity Allocation Block | Set target SKU units to 0 | Attempt next step | Disallows 0 or negative unit allocations. | Verified |
| SCN-295 | Medium | PLN | Decimal Weight Input Handling | Enter raw mass `125.75` kg | Save | Correctly stores 125,750 grams without floating-point precision errors. | Verified |
| SCN-296 | Complex | QAC | Mass Balance Multi-Pack Packing Ratio | 100g, 200g, 500g in single batch | Check combined sum | Verifies exact integer gram summation ($100u_1 + 200u_2 + 500u_3$). | Verified |
| SCN-297 | Simple | OPR | Batch Barcode Generation | Batch row visible | Click "Print Batch Traveler" | Prints traveler sheet with CODE128 barcode of Batch ID for scanning. | Verified |
| SCN-298 | Simple | OPR | Scan Batch Traveler Barcode | Physical scanner connected | Scan batch barcode in search bar | Instantly navigates to and highlights matched batch. | Verified |
| SCN-299 | Medium | PLN | Batch Status Transition Notifications | Status changes to COMPLETED | System banner | Shows green toast notification: "Batch ADTP-2026-001 closed successfully". | Verified |
| SCN-300 | Complex | PLN | Volume 3 Batch Milestone Check | Run full batch lifecycle | Create, allocate, print 10, reconcile, and close | 100% data integrity verified across all batch tables. | Verified |
