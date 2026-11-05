# Volume 06 — Template Hierarchy & Barcodes (Scenarios 501 – 600)

**Domain:** Two-Tier Template Inheritance, Master Corporate Templates, SKU Custom Overrides, Barcode Generation Engine (CODE128, EAN-13, QR Code, GS1 Datamatrix), Checksum Math, Quiet Zones  
**Target:** `https://adalaj-print-lab.vercel.app` & `src/components/designer/`, `src/utils/barcode.ts`, `src/types/template.ts`

---

## 1. Two-Tier Template Hierarchy & Inheritance (SCN-501 – SCN-530)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-501 | Simple | PLN | View Master Templates List | Designer or Templates view | Click "Templates" catalog | Displays list of Master Brand Templates (e.g. Standard Spices 50x25, Premium Organic 75x35). | Verified |
| SCN-502 | Medium | PLN | Create New Master Template | Templates catalog open | Click "+ Create Master Template" | Modal opens; sets master template name, target dimensions, and default machine class. | Verified |
| SCN-503 | Medium | PLN | Define Locked Zones in Master Template | Master template open | Lock header zone with company logo and FSSAI mark | Locked elements display yellow padlock and cannot be moved by SKU overrides. | Verified |
| SCN-504 | Complex | PLN | Derive SKU Template from Master | Master template active | Click "Create Child SKU Variant", select "Turmeric 100g" | Generates child template inheriting all master elements with pointer `parentTemplateId`. | Verified |
| SCN-505 | Complex | PLN | Master Template Propagation to Children | Child template exists | Edit company logo in Master template, click Save | Changes to Master logo propagate automatically to all child SKU templates! | Verified |
| SCN-506 | Complex | PLN | Child SKU Element Override | Child template open | Move SKU-specific pack size badge to X=40mm | Child override persists without altering Master or sibling SKU templates. | Verified |
| SCN-507 | Medium | PLN | Revert Child Override to Master Default | Child element modified | Right-click element, select "Reset to Master" | Reverts position and styling to match parent Master template. | Verified |
| SCN-508 | Simple | PLN | Identify Inherited Elements in Layer Tree | Child template open | Inspect layer tree | Inherited layers show "Master (Locked)" badge in muted slate color. | Verified |
| SCN-509 | Medium | PLN | Detach Child Template from Master | Child template open | Click "Detach from Master" | Converts all inherited elements into independent local editable elements. | Verified |
| SCN-510 | Complex | QAC | Prevent Child from Overriding Regulatory Zones | Master has locked FSSAI number | Attempt to edit in child template | Operation blocked: "Regulatory zone is locked at Master Brand level." | Verified |
| SCN-511 | Simple | PLN | Assign Master Template to Product Category | Product category "Ground Spices" | Select Master Template "Spices Standard 50x25" | All new products in category automatically inherit this master template. | Verified |
| SCN-512 | Simple | PLN | Assign Specific Template to Individual SKU | SKU "Turmeric 5kg Institutional" | Select template "Institutional Bulk Tag 100x150" | Overrides category default; binds bulk tag template directly. | Verified |
| SCN-513 | Medium | PLN | Template Inheritance Conflict Resolution | Both category and SKU specify templates | Check active template in Print Center | SKU-level template takes priority over category-level master template. | Verified |
| SCN-514 | Complex | MNT | Template Versioning & History | Master template edited | Inspect template revision history | Shows list of revisions (v1, v2, v3) with timestamps and author. | Verified |
| SCN-515 | Medium | MNT | Rollback Template to Previous Revision | Revision history open | Select "v1 (10 Jan 2026)", click "Restore" | Restores v1 layout; updates active canvas and child previews. | Verified |
| SCN-516 | Simple | PLN | Duplicate Master Template | Master template selected | Click "Duplicate" | Creates new independent master template "Spices Standard 50x25 (Copy)". | Verified |
| SCN-517 | Simple | PLN | Archive Deprecated Template | Template obsolete | Click "Archive" | Hidden from active batch/SKU template selectors. | Verified |
| SCN-518 | Medium | PLN | Restore Archived Template | Templates list | Filter by "Archived", click "Restore" | Returns template to active status. | Verified |
| SCN-519 | Complex | QAC | Prevent Deletion of In-Use Template | Template assigned to 4 active SKUs | Attempt to delete | Blocked: "Template is currently assigned to active SKUs: ADTP-100G, ADTP-250G." | Verified |
| SCN-520 | Simple | PLN | Template Usage Counter | Templates list visible | Inspect column "Linked SKUs" | Displays count badge: e.g. "Used by 8 SKUs". | Verified |
| SCN-521 | Simple | PLN | Click Usage Badge to View Linked SKUs | Click "Used by 8 SKUs" | Drawer opens | Lists all 8 SKUs using this template with direct navigation links. | Verified |
| SCN-522 | Medium | PLN | Bulk Assign Template to Multiple SKUs | Select 5 SKUs in Products view | Click "Assign Template", select Master | Binds selected template across all 5 SKUs in single transaction. | Verified |
| SCN-523 | Complex | MNT | Export Full Template Hierarchy (Bundle) | Templates view | Click "Export Bundle (JSON)" | Downloads JSON file containing Master and all child variant records. | Verified |
| SCN-524 | Complex | MNT | Import Full Template Hierarchy | Settings / Templates | Upload bundle JSON | Restores parent-child relationship graph cleanly without broken references. | Verified |
| SCN-525 | Simple | PLN | Template Search Filter | Templates catalog | Type "bulk" | Filters catalog to bulk-format templates immediately. | Verified |
| SCN-526 | Simple | PLN | Filter Templates by Machine Compatibility | Templates catalog | Select filter "TIJ 12.5mm Only" | Displays only templates whose height $\le 12.5\text{ mm}$. | Verified |
| SCN-527 | Simple | PLN | Filter Templates by Dimensions | Templates catalog | Filter "50 x 25 mm" | Matches exact dimension templates. | Verified |
| SCN-528 | Medium | PLN | Template Thumbnail Preview | Templates catalog | Observe card preview | Renders mini SVG thumbnail showing live template geometry. | Verified |
| SCN-529 | Medium | PLN | Rename Template | Template settings | Type new name "Spices Standard Export v2" | Updates title across all catalog views. | Verified |
| SCN-530 | Complex | PLN | Volume 6 Tier 1 Milestone Check | Hierarchy test | Edit Master text -> verify child updates -> verify override preserved | 100% verified template inheritance graph behavior. | Verified |

---

## 2. 1D Barcode Engine: CODE128 & EAN-13 (SCN-531 – SCN-565)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-531 | Simple | PLN | Add CODE128 Barcode Element | Designer open | Click "Add Barcode", select "CODE128" | Inserts vector CODE128 barcode element onto canvas with sample text "ADAL12345". | Verified |
| SCN-532 | Simple | PLN | Bind Dynamic Token to CODE128 | CODE128 element selected | In Value field, enter `{BATCH_NUMBER}` | Barcode bars regenerate dynamically matching current batch code. | Verified |
| SCN-533 | Medium | PLN | Dynamic Barcode Value Preview | Live batch selected | Observe barcode visual | Renders barcode for "ADTP-2026-001"; human-readable text below matches string. | Verified |
| SCN-534 | Complex | MNT | CODE128 Checksum Verification | Raw string "ADTP-2026-001" | Barcode renderer generates bars | Computes modulo 103 checksum mathematically; encodes stop character properly. | Verified |
| SCN-535 | Simple | PLN | Toggle Human-Readable Text Display | Barcode selected | Toggle "Show Human Readable" switch | Hides or shows alphanumeric interpretation text below bars. | Verified |
| SCN-536 | Simple | PLN | Adjust Barcode Bar Height | Barcode selected | Set bar height to 12 mm | Stretches vertical bars to 12mm while preserving horizontal pitch. | Verified |
| SCN-537 | Medium | PLN | Adjust Barcode Module Width (Narrow Bar) | Barcode selected | Set module width to 2px vs 3px vs 4px | Scales barcode horizontal density to match printer thermal dot pitch. | Verified |
| SCN-538 | Complex | MNT | Quiet Zone Compliance (CODE128) | Barcode element | Inspect bounding box | Renders mandatory 10x module width blank margin on left and right edges. | Verified |
| SCN-539 | Complex | QAC | Alert on Quiet Zone Violation | Barcode placed < 2mm from canvas edge | Preflight check | Warning: "Barcode quiet zone truncated by label boundary. Risk of scanner failure." | Verified |
| SCN-540 | Simple | PLN | Add EAN-13 Retail Barcode Element | Designer open | Click "Add Barcode", select "EAN-13" | Inserts EAN-13 barcode with sample 12 digits + computed 13th check digit. | Verified |
| SCN-541 | Medium | PLN | Enter 12-digit EAN-13 Payload | EAN-13 selected | Type `890103089421` | Auto-calculates 13th Modulo 10 Luhn check digit `2`; total: `8901030894212`. | Verified |
| SCN-542 | Complex | QAC | EAN-13 Checksum Algorithm Math Check | Payload: `890103089421` | Calculate: $3 \times \text{evens} + 1 \times \text{odds}$ | Confirms exact standard GS1 checksum formula execution. | Verified |
| SCN-543 | Complex | QAC | Reject Invalid EAN-13 Characters | EAN-13 value input | Type "890103ABC421" | Validation flags error: "EAN-13 requires exactly 12 or 13 numeric digits." | Verified |
| SCN-544 | Medium | PLN | Bind EAN-13 to SKU Barcode Token | EAN-13 selected | Set value to `{SKU_BARCODE}` | Resolves to authorized GS1 GTIN stored in SKU master record. | Verified |
| SCN-545 | Simple | PLN | EAN-13 Guard Bars Rendering | EAN-13 rendered | Inspect bars | First, center, and end guard bars extend slightly lower than payload bars per GS1 spec. | Verified |
| SCN-546 | Simple | PLN | EAN-13 Number System & Checksum Font | EAN-13 rendered | Inspect human readable | First digit placed outside left guard bar; 12 digits split 6 and 6 with center notch. | Verified |
| SCN-547 | Medium | PLN | Barcode Rotation (90° / 180° / 270°) | Barcode selected | Set rotation to 90° (Ladder orientation) | Rotates barcode 90°; bars run horizontally across feed web. | Verified |
| SCN-548 | Complex | MNT | Thermal Picket Fence vs Ladder Optimization | Switch rotation | Inspect rendering | Picket fence (0°) generates crisp edges along printhead travel direction. | Verified |
| SCN-549 | Simple | PLN | Invert Barcode Color | Barcode selected | Toggle "Invert (White on Black)" | Inverts bars to white on black box (Note: flags contrast scanner advisory). | Verified |
| SCN-550 | Complex | QAC | Scanner Readability Contrast Warning | Inverted barcode active | Preflight inspects element | Advisory: "Inverted barcodes may fail legacy laser scanners; camera imagers required." | Verified |
| SCN-551 | Simple | PLN | Barcode Position Snapping | Drag barcode | Move near canvas border | Snaps to safe zone guidelines cleanly. | Verified |
| SCN-552 | Medium | PLN | Add GS1-128 Element with Application Identifiers | Barcode options | Select "GS1-128" | Encodes FNC1 start character and AI payloads (e.g. `(01)GTIN(10)BATCH(17)EXP`). | Verified |
| SCN-553 | Complex | PLN | GS1-128 Combined Batch + Expiry | GS1-128 selected | Payload: `(10){BATCH_NUMBER}(17){BEST_BEFORE_YYMMDD}` | Encodes batch and YYMMDD expiry into single high-density GS1 barcode. | Verified |
| SCN-554 | Simple | OPR | Physical Barcode Scanner Test | Barcode rendered on screen | Scan with USB barcode gun | Scanner instantly reads decoded string identically matching payload. | Verified |
| SCN-555 | Simple | PLN | Change Human Readable Font Size | Barcode selected | Set font size to 10pt | Scales human-readable text cleanly below bars. | Verified |
| SCN-556 | Simple | PLN | Barcode Bounding Box Auto-Width | Change barcode text length | Observe width | Bounding box expands horizontally to prevent truncation of bars or quiet zones. | Verified |
| SCN-557 | Complex | MNT | Zero-Aliasing SVG Vector Rendering | Canvas zoomed to 300% | Inspect barcode bars | Bars render as crisp vector paths without blur, fuzziness, or pixel smudging. | Verified |
| SCN-558 | Medium | PLN | Delete Barcode Element | Barcode selected | Press `Delete` | Barcode removed cleanly from canvas. | Verified |
| SCN-559 | Medium | PLN | Duplicate Barcode Element | Barcode selected | Press `Ctrl+D` | Clones barcode element with exact configuration. | Verified |
| SCN-560 | Complex | QAC | Missing Token Barcode Fallback | Value `{MISSING_TOKEN}` | Render barcode | Renders placeholder barcode "NO-DATA" with yellow warning indicator. | Verified |
| SCN-561 | Simple | PLN | Barcode Alignment to Center | Barcode selected | Click "Align Center" | Centers barcode horizontally on label. | Verified |
| SCN-562 | Medium | PLN | Barcode Lock Position | Barcode selected | Click lock icon | Prevents unintentional dragging. | Verified |
| SCN-563 | Simple | PLN | Custom Barcode Label Text | Barcode selected | Enter custom text override | Displays custom caption instead of raw payload string. | Verified |
| SCN-564 | Complex | MNT | 1-bit Binarizer Check on Barcode | Enable 1-bit mode | Inspect raster output | Bar widths remain exact integer multiples of printer dot pitch (no fractional dots). | Verified |
| SCN-565 | Complex | QAC | Barcode Verification Grading Simulation | Barcode properties | Click "Simulate ISO/IEC 15416 Grade" | Returns simulated Grade A (4.0) based on contrast, modulation, and quiet zone. | Verified |

---

## 3. 2D Barcodes: QR Code & GS1 DataMatrix (SCN-566 – SCN-600)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-566 | Simple | PLN | Add QR Code Element | Designer open | Click "Add Barcode", select "QR Code" | Places square QR code element on canvas with default URL "https://adalaj.in". | Verified |
| SCN-567 | Simple | PLN | Bind Dynamic URL to QR Code | QR Code selected | Value: `https://adalaj.in/verify?b={BATCH_NUMBER}` | QR code matrix updates dynamically encoding full verification URL. | Verified |
| SCN-568 | Medium | PLN | QR Code Error Correction Level L (7%) | QR Code selected | Set ECL to "L - Low" | Generates lower density matrix with larger module dots (fastest printing). | Verified |
| SCN-569 | Medium | PLN | QR Code Error Correction Level M (15%) | QR Code selected | Set ECL to "M - Medium (Default)" | Standard industrial balance between size and error resilience. | Verified |
| SCN-570 | Medium | PLN | QR Code Error Correction Level Q (25%) | QR Code selected | Set ECL to "Q - Quartile" | High error correction for harsh manufacturing environments. | Verified |
| SCN-571 | Medium | PLN | QR Code Error Correction Level H (30%) | QR Code selected | Set ECL to "H - High" | Maximum redundancy; allows center logo embedding without read loss. | Verified |
| SCN-572 | Simple | PLN | Resize QR Code Element | QR Code selected | Drag corner handle | Scales QR code symmetrically (always maintains 1:1 aspect ratio). | Verified |
| SCN-573 | Complex | MNT | QR Code Quiet Zone Enforcer | QR Code selected | Inspect margin | Enforces standard 4-module quiet zone border around entire matrix. | Verified |
| SCN-574 | Simple | OPR | Scan QR Code with Smartphone Camera | QR rendered on screen | Point phone camera at QR | Phone immediately recognizes URL `https://adalaj.in/verify?b=ADTP-2026-001`. | Verified |
| SCN-575 | Medium | PLN | Embed FSSAI Verification Link in QR | QR Code selected | Value: `https://fssai.gov.in/verify/{FSSAI_LICENSE}` | Generates regulatory consumer traceability QR code. | Verified |
| SCN-576 | Simple | PLN | Add GS1 DataMatrix Element | Designer open | Click "Add Barcode", select "DataMatrix" | Places 2D DataMatrix code element on canvas. | Verified |
| SCN-577 | Complex | PLN | GS1 DataMatrix Healthcare/FMCG Payload | DataMatrix selected | Enter `(01)08901030894212(10)ADTP-2026-001(17)260714` | Encodes GTIN + Batch + Expiry in compact 2D square matrix. | Verified |
| SCN-578 | Complex | MNT | DataMatrix Compact Size Advantage | Compare QR vs DataMatrix | Measure area for same payload | DataMatrix requires 40% less label surface area than QR code. | Verified |
| SCN-579 | Simple | PLN | DataMatrix Quiet Zone Enforcer | DataMatrix selected | Inspect margin | Enforces 1-module quiet zone per ISO/IEC 16022 standard. | Verified |
| SCN-580 | Medium | PLN | Invert QR Code (White Matrix on Black) | QR selected | Toggle "Invert Matrix" | Renders white module cells on solid black square background. | Verified |
| SCN-581 | Simple | PLN | QR Code Center Logo Placeholder | QR with ECL H | Toggle "Center Logo", select brand mark | Renders small brand icon centered in QR code matrix. | Verified |
| SCN-582 | Complex | QAC | Prevent QR Content Overflow | Enter 2,000 character payload | Observe QR code | System warns of excessive density for thermal resolution; limits text to 500 chars. | Verified |
| SCN-583 | Simple | PLN | QR Code Tooltip with Decoded Content | Hover on QR element | Tooltip appears | Displays: "Payload: https://adalaj.in/verify?b=ADTP-2026-001 (Version 3-M)". | Verified |
| SCN-584 | Medium | PLN | Multi-Barcode Label Layout | Canvas loaded | Place 1D Barcode on left, QR Code on right | Both barcodes render crisply without mutual interference. | Verified |
| SCN-585 | Simple | PLN | QR Code Rotation (0° / 90° / 180° / 270°) | QR Code selected | Rotate 90° | Rotates finder patterns; remains 100% scannable by 2D imagers. | Verified |
| SCN-586 | Complex | MNT | Barcode Dot Pitch Quantization | Canvas rendered for 203 DPI | Inspect module pixels | Each module snaps to an exact integer number of printer dots (e.g. 3 dots = 0.375mm). | Verified |
| SCN-587 | Simple | PLN | Duplicate 2D Barcode | QR selected | Press `Ctrl+D` | Clones QR code element. | Verified |
| SCN-588 | Simple | PLN | Delete 2D Barcode | QR selected | Press `Delete` | Removes QR code cleanly. | Verified |
| SCN-589 | Complex | QAC | Barcode Generation Zero-Error Guarantee | Pass null or undefined token | Barcode engine executes | Catches gracefully; returns safe fallback visual without throwing JS exception. | Verified |
| SCN-590 | Medium | PLN | Batch QR Serialization (Unique Pack UID) | Variable printing mode | Payload: `https://adalaj.in/v/{BATCH_NUMBER}/{SERIAL_NUM}` | QR code matrix updates uniquely for every printed label unit! | Verified |
| SCN-591 | Simple | OPR | Test Print Sheet with Multiple Barcodes | Designer open | Click "Test Barcode Sheet" | Generates verification test print containing all barcode formats. | Verified |
| SCN-592 | Medium | PLN | Barcode Background Transparency Toggle | QR selected | Toggle "Transparent Background" | Removes white backing box when placed over custom background artwork. | Verified |
| SCN-593 | Simple | PLN | Barcode Layer Renaming | Layer tree | Rename to "Consumer Verify QR" | Identifies element clearly in template tree. | Verified |
| SCN-594 | Complex | MNT | SVG DOM Performance with Complex QR | 4 QR codes on canvas | Pan and zoom | Renders in < 16ms per frame using optimized SVG paths. | Verified |
| SCN-595 | Simple | PLN | QR Code Reset to Default | QR selected | Click "Reset Settings" | Reverts to default 15x15mm, ECL M, standard URL. | Verified |
| SCN-596 | Medium | QAC | Regulatory Scan Verification Checklist | Preflight dialog | Inspect checklist | Item "2D Traceability QR Code: VALIDATED (Scannable)". | Verified |
| SCN-597 | Simple | PLN | Barcode Aspect Ratio Lock | QR Code selected | Attempt to drag width handle only | Aspect ratio remains locked at 1:1; prevents rectangular distortion. | Verified |
| SCN-598 | Medium | PLN | DataMatrix Rectangular Form Factor | DataMatrix selected | Choose shape "Rectangular (e.g. 8x32)" | Renders narrow rectangular DataMatrix for slim packaging side-panels. | Verified |
| SCN-599 | Complex | MNT | Offline Barcode Generation Guarantee | Disconnect internet | Generate CODE128, EAN-13, and QR | Generates 100% locally using bundled pure-JS vector libraries. | Verified |
| SCN-600 | Complex | PLN | Volume 6 Milestone Check | Template + Barcode test | Build master template, child SKU variant, bind EAN-13 and QR, scan | 100% verified barcode generation and template hierarchy. | Verified |
