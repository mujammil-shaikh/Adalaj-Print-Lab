# 02 — Product Blueprint & Real-Operator Workflows

## 1. Product objective

Build a dependable label production workbench for people who create product/pack records, plan production batches, design variable-data labels, generate machine-compatible print files, send jobs to a printer or USB workflow, reconcile actual quantities, and later reproduce an exact historical job.

The app is not merely a graphic editor. It coordinates a chain of production facts. Each link must be traceable and validated.

## 2. Human roles and their needs

### Production operator
- Needs few, obvious choices and large readable buttons.
- Must select the correct product, lot, pack size, MRP, date, machine and quantity without navigating unrelated engineering controls.
- Needs a preview and proof step before production.
- Must see whether the output is downloaded, queued, transmitted, acknowledged, or physically printed.
- Needs to record full, partial, rejected, or failed quantities without falsifying the batch status.

### Product/catalogue manager
- Maintains product codes, pack sizes, net weights, authorized MRPs and shelf-life rules.
- Needs import/export, duplicate detection, history of price changes, and SKU completeness status.
- Must not accidentally change an MRP already frozen in a historical print job.

### Designer / process engineer
- Defines layout geometry, fields, fonts, object order, barcode/QR, machine orientation, media and pack print window.
- Needs precise mm controls, rulers, grid, snapping, layers, transforms, reusable styles, validation and versioned templates.
- Must inspect actual dynamic data values, not placeholder-only approximations.

### Supervisor / administrator (future multi-user deployment)
- Controls permissions, releases templates, reviews exceptions, audits jobs, manages printer profiles and backups.
- Needs operator attribution, approvals and a history that cannot be casually overwritten.

## 3. Information architecture

Keep primary navigation to these workspaces:

1. **Home / Shift overview** — active tasks, open batches, printer readiness, data warnings, recent jobs.
2. **Products & SKUs** — catalogue, pack formats, net weights, MRP/shelf-life, import/export/archive.
3. **Batches** — lot creation, allocation calculator, loose inventory and lifecycle.
4. **Designer** — template selection, canvas, layers, object inspector, data binding, validation.
5. **Print Center** — job summary, allocation selection, preflight, proof, export/send, reconciliation.
6. **History** — print jobs, attempts, proof files, exact reprints, revisions and audit.
7. **Settings** — machine, media, pack profiles, connections, calibration, users/roles, backups, shortcuts.

The current project has no dedicated printer profile editor, role/access page, media profile view, or print job list separate from batches. Add them deliberately or keep unsupported features hidden until implemented.

## 4. Canonical workflow state machine

### Product/SKU lifecycle
`Draft → Active → Archived`

A SKU is print-ready only when it has a normalized pack size, positive net weight, valid unit, enabled state, authorized MRP when required, shelf-life rule, and valid product relationship.

### Template lifecycle
`Draft → Review → Approved → Released → Retired`

Only Released templates should be selectable for production jobs unless the user has explicit engineering permission and is in a sandbox/test job. Every release must have version, author, reviewer, effective timestamp, supported machine/media/pack compatibility and validation report.

### Batch lifecycle
`Draft → Open → Partially Allocated / Allocated → In Production → Completed → Archived`

Do not mark a batch Completed just because all allocation rows have `printStatus='Printed'`; compare actual produced quantities, scrap, leftover material, unresolved job attempts and supervisor policy.

### Print job lifecycle
`Draft → Preflight Failed | Ready for Proof → Proof Printed → Proof Approved → Queued → Sending → Device Acknowledged | Send Failed → Operator Reconciled → Closed`

Support `Partial`, `Cancelled`, `Held`, `Duplicate Suspected`, and `Reprint`. Never collapse transport success into physical print completion.

## 5. Operator journey: create a batch

1. Operator chooses **Create Batch**.
2. Selects a product. App filters to that product's active SKUs and permitted pack sizes.
3. App proposes the next batch sequence from the authoritative sequence service; operator may only override with permission and must resolve duplicate/format errors.
4. Enters raw material quantity and manufacturing/lot date. Date is stored as a date-only value, not an ambiguous UTC timestamp.
5. Adds one or more allocations. For each row: choose active SKU/pack size, enter allocated kg, see computed whole-pack count, remainder, authorized MRP, shelf life, MFD, best-before and rate per g. No MRP default may be inferred.
6. Live reconciliation shows raw input = allocation sum + loose stock + documented process loss. If allocations exceed input, block save. If a row is incomplete, show exactly which field needs attention.
7. Operator reviews a confirmation summary and saves. Batch and all allocations are committed in a single transaction. Unique ID is enforced in the database, not just a list scan.
8. Audit event records who created it, timestamp, original input, allocations, calculations, and any override reason.

## 6. Operator journey: design and release a label

1. Select product + exact SKU/pack size and exact machine/media/pack profile.
2. Resolve template in deterministic precedence: product+SKU override, then pack default, then factory starter. Explain which layer supplied the design.
3. Display real field tokens with realistic test values and all required variable lengths (longest realistic product name, highest MRP, longest batch code, maximum dates).
4. Design canvas shows physical dimensions, print band, usable window, safe area, object boundaries, selected object, snapping and rulers.
5. Inspector edits selected element. A layer panel lists every element and provides reorder, visibility, lock and delete. All edits are undoable.
6. Preflight calculates rendered bounding boxes after rotation, text measurement, barcode modules/quiet zones, image decode and exact machine/pack printable region.
7. Save is explicit about scope: current unsaved draft, pack default, or SKU override. Show a diff and warn if overwriting a released/shared template. Use versioning, not silent overwrite.
8. Engineer submits for review/release. Save and release are separate actions.

## 7. Operator journey: print a batch allocation

1. Batch detail opens the requested allocation, not always the first one.
2. Print Center header displays product, SKU/pack, lot, MRP, MFD, best-before, expected packs, already reconciled count, selected machine, media and template version.
3. A preflight checklist shows exact errors and warnings. Errors block proof/job creation; warnings require acknowledgement/reason where safety-critical.
4. Render the immutable preview from the exact values and template version. Provide actual-size view, zoom-to-fit, pack mockup only as a clearly illustrative aid, machine raster, downloadable proof, and compare-to-last approved proof.
5. Operator prints one proof/test sample via a supported route or downloads the proof file. Record proof result, notes and optional photo. Do not label a screen preview a physical test print.
6. On approval, freeze a PrintJob snapshot: template JSON, resolved field values, selected SKU/batch/allocation, machine/pack/media profiles, transforms, DPI, renderer version, barcode payloads, generated output file hashes, operator and timestamps.
7. Export/download or transmit. Hardware response is separate from human physical confirmation.
8. Reconcile actual printed quantity, rejected/scrapped quantity, reason and remaining expected quantity. A partial run stays partial/open.
9. Print attempt and reconciliation are stored as append-only records. Job may be retried; every retry has attempt ID and duplicate-risk guard.

## 8. Operator journey: exact reprint

1. Open a historical PrintJob, not a Batch's current state.
2. Show the original proof thumbnail, immutable values, template version, machine profile and output file hashes.
3. Operator selects **Reprint this snapshot**. App creates a child reprint job referencing original `printJobId`, retaining original content and recording the new operator/reason/time/attempt.
4. New reprint cannot silently substitute current MRP, current template, current label date, or current machine orientation. Any intentional change requires **Create new job from old job** and is not labeled exact.

## 9. Non-negotiable validations

- MRP: missing, zero, negative, or non-finite is an error when MRP is a required field. Never guess.
- Pack size: parse into canonical grams. Reject unparseable/zero values instead of defaulting to 100 g.
- Quantity: all kg and gram conversions explicit; whole packs are floor only when policy says remainder is loose. Display remainder and rounding.
- Date: date-only calculation with leap-year/month-end tests. SKU shelf-life override takes precedence over product default. Apply defined business policy for “months” and expiry date.
- Batch ID: unique under concurrent creation; format/prefix validated.
- Data: required fields cannot contain unresolved `{token}` values at final preflight.
- Geometry: no out-of-window/rotated clipping, too-small text, invalid code, missing asset, invalid scale or unsupported color channel.
- Printer: unsupported protocol/profile blocks “Transmit”; fallback to USB package can be chosen with clear instructions.
- State: failed saves/transfers do not claim success and preserve all user-entered values.

## 10. UX rules

- One primary action per step. Keep secondary actions visually quieter.
- Show current product, SKU, batch, template, machine and job consistently in breadcrumbs/context header.
- Use explicit unit labels (`kg`, `g`, `mm`, `px`, `DPI`, `₹`) and avoid bare numbers.
- Avoid relying on amber/green/red alone: pair status color with text and icon.
- Use confirmation only for consequential operations. Do not ask users to confirm ordinary navigation or safe undoable edits.
- For irreversible actions, state the exact record and effect: “Create job”, “Record 148 packs printed”, “Archive SKU”; never generic “OK”.
- Keep all modals keyboard accessible with focus management, Escape handling, and focus return.
- Keep draft work if the operator changes route accidentally; warn on unsaved changes and provide recovery.
