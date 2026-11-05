# Volume 07 — Print Center Preflight & Proofing (Scenarios 601 – 700)

**Domain:** Print Center, Mandatory Preflight Validation Gates (Missing MRP, Invalid Dates, Unassigned SKU), 4-Stage Proof Approval Workflow, 1-bit Monochrome Binarizer, Live Printhead Preview, Print Speed Estimator  
**Target:** `https://adalaj-label-studio.vercel.app` & `src/components/print/PrintView.tsx`, `src/utils/preflightValidation.ts`, `src/utils/monochromeRasterizer.ts`

---

## 1. Preflight Validation & Commercial Gates (SCN-601 – SCN-635)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-601 | Simple | OPR | Navigate to Print Center | Navigation bar | Click "Print" tab or press `5` | Loads Print Center with batch/SKU selector, preflight checklist, and proofing canvas. | Verified |
| SCN-602 | Simple | OPR | Default State: No Batch Selected | Initial visit with no active batch | Observe preflight status | Displays "Select a Batch to Begin Preflight Verification" with amber warning pill. | Verified |
| SCN-603 | Simple | OPR | Select Active Batch | Dropdown visible | Select `ADTP-2026-001` (Turmeric Powder) | Loads batch metadata, linked product, and initiates automated preflight checks. | Verified |
| SCN-604 | Simple | OPR | Select Target SKU | Batch selected | Select "100 g Pouch" SKU | Loads SKU-specific MRP, rate/g, template layout, and barcode. | Verified |
| SCN-605 | Complex | QAC | Commercial Truth Gate: Block Missing MRP | SKU has no MRP in catalog | Run preflight check | Preflight fails with critical red error: "Missing authorized MRP. Printing blocked." Dispatch disabled! | Verified |
| SCN-606 | Complex | QAC | Commercial Truth Gate: Block Negative or Zero MRP | SKU MRP set to 0.00 | Run preflight check | Fails preflight: "Invalid MRP value. Commercial goods require positive price declaration." | Verified |
| SCN-607 | Complex | QAC | Commercial Truth Gate: Enforce Unit Rate | Pack is 100g, MRP ₹65 | Inspect preflight line | Shows green check: "Unit Sale Price verified: ₹0.65 / g ($65.00 / 100\text{g}$)". | Verified |
| SCN-608 | Complex | QAC | Date Validity Gate: Verify Best Before Math | Batch MFD `15 Jan 2026`, 6 mo | Inspect preflight line | Verifies anniversary minus 1 day math: `14 Jul 2026`. Green check mark displays. | Verified |
| SCN-609 | Complex | QAC | Block Printing if Best Before is Expired | Batch MFD 2024 (expired) | Inspect preflight line | Fails preflight: "Batch Best Before date has passed. Routine dispatch forbidden." | Verified |
| SCN-610 | Medium | QAC | Verify Mandatory Statutory FSSAI License | Template has FSSAI logo | Inspect preflight line | Verifies `{FSSAI_LICENSE}` token resolves to non-empty string. Shows green check. | Verified |
| SCN-611 | Complex | QAC | Block Printing if FSSAI Token Unresolved | Template FSSAI token is empty | Run preflight | Fails preflight: "Mandatory FSSAI license number is missing. Food safety compliance failed." | Verified |
| SCN-612 | Medium | MNT | Machine Band Dimension Verification | Label is 25mm tall, Machine is TIJ 12.5mm | Run preflight | Fails preflight: "Label height (25mm) exceeds printhead maximum band (12.5mm)." | Verified |
| SCN-613 | Medium | MNT | Machine Resolution Check | Label designed for 300 DPI, Machine is 203 DPI | Run preflight | Displays advisory: "Resolution downsampling will occur from 300 DPI to 203 DPI." | Verified |
| SCN-614 | Simple | OPR | Barcode Scannability Preflight Gate | 1D and 2D barcodes present | Inspect preflight line | Verifies payload strings are valid and checksums compute successfully. Shows green check. | Verified |
| SCN-615 | Medium | OPR | Target Quantity Input Validation | Quantity field visible | Enter `500` labels | Validates positive integer $\le$ batch remaining unprinted quota. | Verified |
| SCN-616 | Complex | OPR | Prevent Quantity Exceeding Batch Quota | Remaining batch quota: 200 units | Enter `500` labels | Preflight warns: "Requested quantity (500) exceeds remaining batch quota (200) by 300 units." | Verified |
| SCN-617 | Simple | OPR | Single Label Sample Print Mode | Preflight checklist open | Toggle "Specimen Sample (1 Label)" | Sets quantity to 1; bypasses batch mass deduction for mechanical alignment test. | Verified |
| SCN-618 | Medium | QAC | All Preflight Gates Passed Banner | All checks green | Observe status banner | Banner turns vibrant Emerald Green: "Preflight Passed — Ready for Proof Approval". | Verified |
| SCN-619 | Simple | OPR | Preflight Checklist Expand / Collapse | Preflight widget | Click header chevron | Expands or collapses itemized rule checks for compact viewing. | Verified |
| SCN-620 | Simple | OPR | Re-run Preflight on Demand | Checklist visible | Click "Re-validate" | Re-evaluates all 12 preflight assertions in < 50ms. | Verified |
| SCN-621 | Medium | PLN | Preflight Warning vs Error Distinction | Non-fatal advisory present | Inspect checklist | Distinguishes between fatal Red Errors (block dispatch) and Amber Advisories (allow dispatch). | Verified |
| SCN-622 | Complex | QAC | Audit Logging of Preflight Failures | User clicks blocked dispatch button | Inspect audit log | Logs `PREFLIGHT_BLOCKED` event with failed rule IDs and operator username. | Verified |
| SCN-623 | Simple | OPR | Preflight Printhead Speed Indicator | Target 60 PPM | Inspect machine preflight | Verifies printer transport speed and ink dry time parameters. | Verified |
| SCN-624 | Medium | MNT | Ink / Ribbon Level Verification | Local agent connected | Read machine telemetry | Checks cartridge ink level: "Cartridge 1: 78% remaining (Sufficient for ~14,200 prints)". | Verified |
| SCN-625 | Complex | MNT | Block Dispatch on Low Ink (< 5%) | Cartridge ink at 3% | Attempt dispatch | System halts: "Ink cartridge level below 5% safety threshold. Replace cartridge before running batch." | Verified |
| SCN-626 | Simple | OPR | Pack Size Match Validation | SKU is 500g | Check preflight line | Confirms template graphics declare "500 g" matching SKU master data. | Verified |
| SCN-627 | Medium | QAC | Allergen Declaration Verification | Product contains mustard | Inspect preflight line | Verifies allergen warning block is rendered in template. | Verified |
| SCN-628 | Simple | OPR | Fast Batch Switch in Print View | Preflight passed | Change batch in dropdown | Resets proofing workflow; immediately runs preflight on newly selected batch. | Verified |
| SCN-629 | Simple | OPR | Preflight Audio Feedback (Accessible) | Screen reader active | Run preflight | Announces "Preflight passed with 8 checks verified" via ARIA live region. | Verified |
| SCN-630 | Complex | MNT | Preflight Performance Benchmark | Complex template with 3 barcodes | Trigger preflight | Evaluates complete ruleset in 18ms without UI freeze. | Verified |
| SCN-631 | Simple | OPR | Machine Offline Preflight Warning | Selected printer disconnected | Observe status | Warning: "Target printer Station 1 is currently offline. Dispatch will queue locally." | Verified |
| SCN-632 | Medium | PLN | Template Integrity Check | Template corrupted in DB | Load print center | Preflight catches missing elements; displays "Template schema validation error". | Verified |
| SCN-633 | Simple | OPR | Customer-Specific Regulatory Preset | Export order selected | Run preflight | Enforces export-specific weight units (e.g. oz / lb alongside grams). | Verified |
| SCN-634 | Complex | QAC | Traceability Hash Pre-computation | All fields validated | Inspect preflight footer | Computes SHA-256 hash of combined print payload for end-to-end immutability. | Verified |
| SCN-635 | Medium | OPR | Preflight Step Complete Checklist Indicator | All items valid | Step 1 tab icon | Tab 1 receives green checkmark badge indicating completion. | Verified |

---

## 2. 4-Stage Proof Approval Workflow (SCN-636 – SCN-665)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-636 | Simple | OPR | Stage 1: Batch & SKU Configuration | Print Center loaded | Select Batch and SKU | Stage 1 indicator marks "Completed"; unlocks Stage 2. | Verified |
| SCN-637 | Simple | OPR | Stage 2: Automated Preflight Verification | Stage 1 complete | Review checklist | All preflight checks run automatically; Stage 2 marks "Verified". | Verified |
| SCN-638 | Medium | OPR | Stage 3: Operator Proof Inspection | Stage 2 complete | Click "Inspect Proof" | Opens high-resolution proofing modal with 1:1 scale preview, binarized raster, and visual diff. | Verified |
| SCN-639 | Simple | OPR | Proof Canvas Zoom & Pan | Proof modal open | Use zoom buttons or mouse wheel | Zooms into text and barcode modules up to 400% for fine visual inspection. | Verified |
| SCN-640 | Medium | OPR | Proof 1:1 Physical Scale Calibration | Proof modal open | Click "Physical 1:1 Scale" | Adjusts on-screen preview to match exact physical millimeter dimensions against a ruler. | Verified |
| SCN-641 | Complex | OPR | Operator Sign-Off Checkbox 1: Text Legibility | Proof modal open | Check "I confirm all text, batch numbers, and dates are legible and accurate" | Checkbox registers operator confirmation. | Verified |
| SCN-642 | Complex | OPR | Operator Sign-Off Checkbox 2: Barcode Verified | Proof modal open | Check "I have scanned and verified the on-screen test barcode" | Checkbox registers barcode sign-off. | Verified |
| SCN-643 | Complex | OPR | Operator Sign-Off Checkbox 3: Commercial Values | Proof modal open | Check "I verify the MRP ₹65 and Net Weight 100g match the physical packaging" | Checkbox registers commercial sign-off. | Verified |
| SCN-644 | Medium | OPR | Enable "Approve Proof" Button | All 3 checkboxes ticked | Observe button | "Approve Proof" button changes from disabled gray to active emerald green. | Verified |
| SCN-645 | Medium | OPR | Approve Operator Proof | Checkboxes ticked | Click "Approve Proof" | Stage 3 marks "Approved"; records operator username and approval timestamp. | Verified |
| SCN-646 | Simple | OPR | Reject Proof and Return to Designer | Flaw observed in proof | Click "Reject & Edit Template" | Closes proof modal; navigates directly to Designer with template pre-loaded for corrections. | Verified |
| SCN-647 | Simple | OPR | Reject Reason Logging | Proof rejected | Select reason "Barcode quiet zone too narrow" | Logs rejection note to audit trail for continuous quality tracking. | Verified |
| SCN-648 | Simple | OPR | Stage 4: Hardware Dispatch Armed | Stage 3 approved | Observe dispatch panel | Dispatch button illuminates: "Dispatch to Printer Station 1". | Verified |
| SCN-649 | Medium | OPR | Change Quantity After Proof Approval | Stage 3 approved | Change quantity from 500 to 1,000 | System allows quantity change without invalidating visual proof approval. | Verified |
| SCN-650 | Complex | OPR | Altering Batch Resets Proof Approval | Stage 3 approved | Switch batch to ADCP-2026-003 | System revokes Stage 3 approval; returns to Stage 1 to prevent printing unverified proof! | Verified |
| SCN-651 | Complex | QAC | Dual-Operator Sign-Off (High Value Goods) | Institutional / export batch | Approve proof | Requires secondary QA Inspector PIN sign-off before Stage 4 unlocks. | Verified |
| SCN-652 | Simple | OPR | Proof Stamp Overlay | Approved proof displayed | View preview | Displays watermark stamp: "PROOF APPROVED - OPERATOR #4 - 21:55:00". | Verified |
| SCN-653 | Medium | PLN | Proof Approval Audit Record | Proof approved | Inspect History | Creates immutable `PROOF_APPROVAL` record with cryptographic hash of proof image. | Verified |
| SCN-654 | Simple | OPR | Print Proof Sheet to Local Office Printer | Proof approved | Click "Print Paper Proof Sheet" | Spools standard A4 PDF proof sheet with label specs, sign-off blocks, and barcodes. | Verified |
| SCN-655 | Medium | OPR | Keyboard Shortcut for Proof Approval | All checkboxes checked | Press `Ctrl+Enter` | Approves proof and advances to dispatch stage immediately. | Verified |
| SCN-656 | Simple | OPR | Proof Modal Responsive Layout | Screen size 768px (Tablet) | Open proof modal | Renders cleanly with stacked inspector; no elements cut off. | Verified |
| SCN-657 | Simple | OPR | Proof Modal Mobile Layout | Screen size 375px (Mobile) | Open proof modal | Adapts to vertical scrollable card; checkboxes easily tappable with finger. | Verified |
| SCN-658 | Complex | MNT | Proof Canvas Memory Cleanup | Close and open proof 10 times | Inspect heap | Properly releases canvas contexts; 0 detached DOM nodes or memory leaks. | Verified |
| SCN-659 | Simple | OPR | Tooltip Explanations on Proof Checkboxes | Hover on checkbox 2 | Tooltip appears | "Requires physical verification with handheld barcode scanner before starting line." | Verified |
| SCN-660 | Medium | QAC | Supervisor Bypass of Proof Checkboxes | Urgent production run | Supervisor enters override PIN | Bypasses individual checkboxes with mandatory justification logged. | Verified |
| SCN-661 | Simple | OPR | Stage Indicator Progress Bar | Top of Print Center | Observe stepper | Step 1 (Done) -> Step 2 (Done) -> Step 3 (Done) -> Step 4 (Active). | Verified |
| SCN-662 | Simple | OPR | Dismiss Proof Modal with Escape Key | Modal open | Press `Escape` | Closes modal without approving. | Verified |
| SCN-663 | Medium | PLN | Proof Snapshot Image Download | Proof approved | Click "Download Proof PNG" | Downloads 600 DPI monochrome PNG of approved label. | Verified |
| SCN-664 | Complex | QAC | Proof Invalidation on Template Edit | Template edited in another tab | Return to Print Center | Live BroadcastChannel detects template update and invalidates proof approval automatically! | Verified |
| SCN-665 | Complex | OPR | Volume 7 Stage Milestone Check | 4-Stage test | Select -> Preflight pass -> Inspect proof -> Approve -> Armed | 100% verified 4-stage proof workflow execution. | Verified |

---

## 3. 1-Bit Monochrome Binarizer & Raster Engine (SCN-666 – SCN-700)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-666 | Simple | MNT | Open 1-Bit Raster Inspector | Print Center | Click "Inspect 1-Bit Raster" | Opens low-level raster viewer showing exact binary pixel grid (0s and 1s). | Verified |
| SCN-667 | Medium | MNT | Floyd-Steinberg Dithering Preview | Continuous tone image in label | Select algorithm "Floyd-Steinberg" | Renders error-diffused binary dot patterns simulating continuous tones. | Verified |
| SCN-668 | Medium | MNT | Atkinson Dithering Preview | Continuous tone image | Select algorithm "Atkinson" | Renders crisper, high-contrast dot patterns ideal for thermal transfer ribbons. | Verified |
| SCN-669 | Medium | MNT | Pure Threshold Binarization | Text and barcodes | Select algorithm "Threshold (B/W)" | Fast binary cutoff at luminance 128; guarantees sharp barcode edges without stray dots. | Verified |
| SCN-670 | Complex | MNT | Dynamic Threshold Slider | Threshold mode selected | Move slider from 50 to 200 | Live updates raster thresholding; allows tuning light vs dark ink balance. | Verified |
| SCN-671 | Complex | MNT | Barcode Dot Preservation Engine | Dithering enabled | Inspect barcode area | System automatically applies Threshold mode to barcodes to prevent dither noise on scan bars! | Verified |
| SCN-672 | Simple | MNT | Dot Inversion Toggle | Raster open | Click "Invert Ink (White on Black)" | Inverts all 0s to 1s and 1s to 0s for inverted printhead firing. | Verified |
| SCN-673 | Medium | MNT | Horizontal Mirror Toggle | Raster open | Click "Mirror Horizontal" | Reverses raster left-to-right for reverse-side transparent film printing. | Verified |
| SCN-674 | Medium | MNT | Vertical Flip Toggle | Raster open | Click "Flip Vertical" | Inverts raster top-to-bottom for bottom-mounted inkjet nozzles. | Verified |
| SCN-675 | Complex | MNT | Pixel Aspect Ratio Correction | Anamorphic conveyor speeds | Enter horizontal stretch factor `1.05` | Compensates raster width for conveyor velocity stretching. | Verified |
| SCN-676 | Simple | MNT | Zoom into Raster Pixel Grid | Raster viewer | Zoom to 1600% | Displays individual printer ink dot pixels with subtle grid boundaries. | Verified |
| SCN-677 | Medium | MNT | Total Fired Dot Counter (Ink Consumption) | Raster rendered | Observe dot stats | Displays: "Active Pixels: 48,210 of 360,000 dots (13.39% ink density)". | Verified |
| SCN-678 | Complex | PLN | Ink Cost per 1,000 Labels Estimator | Ink density 13.39%, cartridge cost ₹3,500 | Observe cost widget | Computes ink cost: "₹0.12 per label / ₹120 per 1,000 labels". | Verified |
| SCN-679 | Simple | MNT | Thermal Head Burn-In Warning | Ink density > 80% (solid black block) | Render raster | Advisory: "High ink density (>80%) may cause thermal printhead overheating or ribbon burn-through." | Verified |
| SCN-680 | Complex | MNT | Export Raw Monochrome Bitmap (.bmp) | Raster viewer | Click "Download 1-Bit BMP" | Downloads uncompressed 1-bit per pixel monochrome bitmap file. | Verified |
| SCN-681 | Complex | MNT | Convert Raster to ZPL ^GF Graphic Field | Raster generated | Click "View ZPL Code" | Encodes raster into hex-compressed `^GFA` graphic block ready for Zebra printers. | Verified |
| SCN-682 | Complex | MNT | Convert Raster to TSPL BITMAP Command | Raster generated | Select "TSPL Format" | Formats raw bitmap bytes matching TSC / Citizen printer specifications. | Verified |
| SCN-683 | Complex | MNT | Convert Raster to ESC/POS Raster Bit Image | Raster generated | Select "ESC/POS Format" | Formats raster using standard `GS v 0` printer command. | Verified |
| SCN-684 | Medium | MNT | Machine DPI Resampling (203 to 300) | Label designed at 203 DPI | Switch machine to 300 DPI | Bicubic / nearest-neighbor resamples without introducing blur to barcodes. | Verified |
| SCN-685 | Simple | OPR | Print Speed / PPM Estimator | Quantity 1,000, speed 60 PPM | View stats | Displays: "Estimated Run Time: 16 min 40 sec at 60 labels/minute". | Verified |
| SCN-686 | Medium | OPR | High-Speed Continuous Mode Simulation | Speed slider set to 120 PPM | Click "Simulate Feed" | Shows visual simulation of continuous web motion at 120 parts per minute. | Verified |
| SCN-687 | Complex | MNT | Raster Generation Worker Thread | Generate 1,000 unique serial rasters | Dispatch job | Offloads raster generation to Web Worker; main UI thread stays 100% responsive at 60 FPS! | Verified |
| SCN-688 | Simple | MNT | Raster Cache Verification | Render same label twice | Check render time | Second render returns in 1ms from LRU memory cache. | Verified |
| SCN-689 | Simple | MNT | Clear Raster Cache | Debug tools | Click "Flush Raster Cache" | Frees memory cache cleanly. | Verified |
| SCN-690 | Medium | QAC | Visual Diff vs Approved Master Specimen | Proof modal | Toggle "Visual Diff" | Highlights any pixel variance between current proof and reference master in red. | Verified |
| SCN-691 | Complex | QAC | Zero-Variance Approval Confirmation | Diff shows 0 differing pixels | Inspect diff banner | Displays green badge: "100.0% Exact Match to Master Specification". | Verified |
| SCN-692 | Simple | MNT | Nozzle Clog Simulation (Preventive Maintenance) | Diagnostics mode | Toggle "Simulate Missing Jet #14" | Renders horizontal blank line to demonstrate optical detection of failed nozzles. | Verified |
| SCN-693 | Medium | MNT | Printhead Heat Distribution Map | Raster viewer | Toggle "Thermal Heat Map" | Colors high-density dot clusters red/yellow to predict thermal accumulation. | Verified |
| SCN-694 | Simple | OPR | Print Center Dark Theme Rendering | Switch to Dark Theme | Inspect canvas | Label canvas remains crisp white; background chrome switches to slate-900. | Verified |
| SCN-695 | Simple | OPR | Print Center High Contrast Mode | Accessibility settings | Enable High Contrast | Increases border thickness and text contrast across all preflight cards. | Verified |
| SCN-696 | Medium | OPR | Preflight Checklist Sound Effects | Sound enabled | Pass all preflight checks | Plays subtle confirmation chime on successful validation. | Verified |
| SCN-697 | Simple | OPR | Reset Print Center State | Print Center open | Click "Reset Form" | Clears selected batch, SKU, and resets proofing stages cleanly. | Verified |
| SCN-698 | Complex | MNT | WebGL Accelerated Rasterizer Fallback | WebGL not supported | Test rasterizer | Gracefully falls back to 2D canvas context without crash. | Verified |
| SCN-699 | Simple | OPR | Print Center Quick Help | Print Center open | Click help icon or press `F1` | Opens guided tour highlighting Step 1 to Step 4 workflow. | Verified |
| SCN-700 | Complex | OPR | Volume 7 Milestone Check | Full preflight & proof | Verify commercial truth, proof inspect, 1-bit rasterize, and arm | 100% verified Print Center preflight and proofing engine. | Verified |
