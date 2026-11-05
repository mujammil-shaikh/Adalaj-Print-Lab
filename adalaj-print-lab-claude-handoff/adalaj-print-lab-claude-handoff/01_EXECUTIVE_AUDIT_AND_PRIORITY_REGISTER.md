# 01 — Executive Audit & Priority Register

## Overall assessment

The archive is a promising front-end prototype, not yet a dependable production printing system. It has a rich React interface and domain concepts, but its UI promises exceed what the persistence, print pipeline, hardware adapters, and audit trail actually guarantee. Several defects can cause wrong commercial data to be printed or cause the operator to believe printing succeeded when it did not. These are release blockers.

The code currently has no application server in the archive. Dexie/IndexedDB is the actual persistence layer. An `express` dependency is listed, but there is no implemented server entry point or API. There is no authentication, role model, shared central database, server-side validation, job queue, or trusted printer bridge.

## Release blockers — P0

| ID | Confirmed source issue | Why an operator can be harmed | Required correction |
|---|---|---|---|
| P0-01 | Network transport uses browser `fetch` with `mode: 'no-cors'`; catch path returns `success: true` (`src/services/hardwareAdapters.ts`, network methods). | False “sent” status, silent failed print, duplicated production attempt, wasted stock/time. Browser fetch is not a raw TCP socket. | Move raw TCP/industrial protocol handling to a trusted local print agent or backend worker. Report distinct states: prepared, queued, bytes accepted, device acknowledged, operator confirmed. Never turn errors into success. |
| P0-02 | Barcode and QR are rendered by the same pseudo-random placeholder bars (`src/services/printTransform.ts:525–535`). | Codes will not scan; operator may ship untraceable packs. | Use a standards-compliant encoding library for each selected symbology. Validate input, module size, quiet zone, error correction, checksum, and raster output. Test with independent decoders and physical scanners. |
| P0-03 | MRP defaults are injected in batch creation and preview (`BatchesView.tsx:62–65, 130–140, 190–214, 237–265`; `PrintView.tsx:103–119`; `HomeView.tsx:57–80`). | A missing or unknown MRP can be printed as ₹50/₹220 or another formula-derived value. | Remove all implicit commercial fallback values. Missing required price is a blocking validation error. Print only a reviewed immutable snapshot. |
| P0-04 | “Reprint Exact” does not use `PrintJob`; the print-job table is declared but never written/read (`db.ts`, `HistoryView.tsx`, `App.tsx`). | Historical output can change when a template, machine profile, or SKU changes. It is not an exact reprint. | Persist a complete immutable job snapshot plus final output assets and transform. Reprint by loading that exact snapshot; show a new reprint attempt linked to the original. |
| P0-05 | `handleMarkPrinted` sets an allocation to Printed and uses the UI-provided full expected count, without verifying a print job (`App.tsx:541–577`, `PrintView.tsx:401`). | Records production as completed when only a file was downloaded or a transmission attempt failed. | Separate print attempt and operator reconciliation. Only record actual quantity from acknowledgement or explicit operator confirmation with reason. Partial runs must be supported. |
| P0-06 | No production backend/shared datastore or access control exists in the archive (`src/services/db.ts`, `App.tsx`). | Records are isolated to one browser profile/device and can be lost; no operator identity or multi-station synchronization. | Select and implement a supported deployment architecture: local single-workstation with local print agent, or authenticated API + shared database + local edge agent. Do not call local IndexedDB a central system. |
| P0-07 | Batch creation silently increases recorded raw mass to match allocation (`BatchesView.tsx:218–227`) and silently substitutes invalid/zero values with fallback values. | Inventory reconciliation and pack quantities become untrustworthy. | Reject over-allocation and invalid allocations; account separately for input, allocated, yield loss, scrap, and remaining loose stock. |
| P0-08 | AI proposals mark changes approved by default and the “apply” handler only writes an audit log for most change types; no actual batch/allocation/MRP mutation (`aiCopilot.ts:60–180, 224–248`; `App.tsx:808+`). | User sees a proposal as if it were applied; AI quick action can mislead the operator. | AI must be disabled for mutation until action-specific executors exist. Default all proposals unapproved. Apply only typed, validated, transactional actions; verify result before success. |

## High-priority correctness — P1

| ID | Finding | Why it matters | Required correction |
|---|---|---|---|
| P1-01 | `PrintView` always resolves template from first allocation in `App.tsx:701–721`; changing allocation does not change template. | A 500 g job may use the first allocation's 100 g layout. | Resolve the template from the exact selected allocation's product+pack size, and recalculate when selection changes. |
| P1-02 | `onNavigateToPrint(b, allocId)` drops `allocId` in `App.tsx:652–655`. | The selected allocation is lost; user lands on another pack size. | Preserve route parameters and make batch/allocation selection URL-addressable. |
| P1-03 | Designer `Fit Selected` calls an engine that reflows all objects in Vertical+Stack (`fitEngine.ts`, `DesignerView.tsx:751–763`). | Moving one object unexpectedly moves other lines. | Implement true target-only fitting. Make “fit all” a separate explicit operation with preview and undo. |
| P1-04 | Fit validation ignores negative coordinates, rotated bounds, actual dynamic values, and full printable window; its overlap check is axis-aligned. | Layout can pass while rendering clipped/overlapping content. | Use rotated bounding geometry and actual per-allocation resolved text/asset measurements. Block export on errors. |
| P1-05 | Printer DPI metadata is hardcoded to 300 in both BMP writers (`printTransform.ts:72–73, 160–161`). | Non-300 DPI machine exports have incorrect physical metadata. | Generate pixel dimensions and BMP PPM from active DPI independently on X/Y. Validate controller-specific bitmap requirements. |
| P1-06 | Image drawing is synchronous and skips assets that have not loaded yet (`printTransform.ts:519–524`). | First render/export may omit a logo/image. | Preload/decode every asset asynchronously before render and export; fail clearly for missing/corrupt assets. |
| P1-07 | `invert` only switches foreground text to white without painting a contrasting background (`printTransform.ts:451`). | Inverted text can become invisible on a white canvas. | Implement explicit fill/background semantics and validate 1-bit output. |
| P1-08 | `symbol` exists in the type system but has no renderer branch (`types/index.ts`, `printTransform.ts:432–535`). | Supported-looking object can disappear from final raster. | Implement symbol assets/vector support or remove tool/type from UI until supported. |
| P1-09 | Horizontal/vertical pass planning uses assumptions and fixed values (e.g. 3 objects/column, 20 mm split, 35 mm travel; `passPlanner.ts`). | Export manifest may not match actual passes or physical machine. | Plan from actual geometry, clipping constraints, object IDs, machine limits, and overlap; one file per actual pass. |
| P1-10 | `ProductsView` inline save and App handlers are async but the view does not await or show error state (`ProductsView.tsx:83–99`; `App.tsx:403–423`). | Failure appears saved; user loses price edits. | Await mutations; disable while saving; show success/failure; keep unsaved value on failure. |
| P1-11 | Settings machine profiles are only displayed/selected; `onUpdateMachine` is passed but no machine edit form calls it. | Machine specs are not actually configurable in the promised UI. | Build validated machine profile editor with capability-specific fields and test profile. |
| P1-12 | Screen calibration stores `als_screen_scale_factor` but canvas does not consume it (`SettingsView.tsx:99–103, 547–589`). | “True physical dimensions at 100%” claim is false. | Make screen calibration explicitly a screen-preview-only scale and wire it to viewport/rulers, or remove the claim/control. Never change export pixel/mm mapping from display calibration. |
| P1-13 | Shortcut settings change displayed shortcut but hardcoded global dispatcher ignores remappings; reset does not restore the default string (`actionRegistry.ts:83–115`, `App.tsx:344–400`). | Users cannot trust keyboard shortcuts; custom mappings appear saved but do nothing. | Use a single registry-driven dispatcher for every action; store defaults separately; support keydown capture and true conflict detection. |
| P1-14 | CSV export does not escape embedded quotes and CSV import is not implemented although `Upload` is imported and view description says import/export. | Excel-imported catalogue can be corrupted; feature is misleading. | Use a CSV parser/stringifier with quoting, BOM, validation preview, duplicate handling, dry-run, and transactional import. |
| P1-15 | `HomeView` uses hard-coded sample dates, batch fallback, MRP/rate values and “Ready to Print” badge; preview template can mismatch selected SKU. | Dashboard creates false production readiness and false confidence. | Derive all values from selected batch/allocation and real validation; display Needs Data / Blocked / Ready with drill-down. |
| P1-16 | Seed initialization exits if one business exists, even if other tables are partially missing (`db.ts:67–69`). | Partial/failed state cannot recover missing seed catalogs. | Versioned migration and idempotent per-table seed repair with integrity checks. |
| P1-17 | Initialization rejection is not caught in `App.tsx:181–192`; loading can remain indefinitely. | User sees an endless spinner instead of actionable recovery. | Add loading/error states, retry, database diagnostics, and safe recovery instructions. |
| P1-18 | Backup import merges via `bulkPut`, does not provide versioned dry-run/rollback, and export omits some tables (`SettingsView.tsx:139–198`). | Restore leaves stale records or silently produces incomplete/mixed state. | Add schema-versioned complete export/import, integrity validation, conflict mode, backup-before-restore, atomic replacement and result report. |

## Medium-priority user-experience / engineering — P2

- `App.tsx` is the stateful monolith and route changes are local state, not URL routes; refresh/deep link/browser back are not dependable.
- `DesignerView.tsx` is approximately 2,854 lines in a single component; separate canvas, toolbar, layers, inspector, dialogs, and domain actions.
- Global keyboard actions and editor keyboard handlers can overlap. Designer nudge handler excludes input/select/textarea but does not cover all editable targets; Ctrl+S is attached regardless of text-entry state.
- Drag uses mouse events, not pointer events; no touch/stylus path or pointer capture. It permits off-canvas coordinates.
- Many icon-only buttons and clickable `div` cards lack explicit accessible names or keyboard behavior.
- Empty/error/loading states are inconsistent; `console.error` or `alert()` is used where contextual inline feedback is needed.
- Product and batch lists have limited filtering, no pagination, no archive/restore workflow, and few drill-down affordances.
- `HistoryView` uses `packsPrinted || expectedPacks`; zero printed can be misrepresented as fully printed. It special-cases the seed ID `ADTP013`.
- Audit is not immutable: browser-local records have no tamper protection, complete mutation coverage, user identity, or linked before/after snapshots for all writes.
- No media profile editing/selection is present despite persisted media profiles and props being passed.
- PWA “offline” is only a browser online/offline indicator. It does not reveal unsynced changes or central sync state.
- Header claims “Universal Platform” / “Any printer” despite no verified universal protocol implementation.

## Product design principles

1. A human operator needs to know **what will print, where it will print, and whether it actually printed**.
2. Every destructive or production-impacting action needs a clear object, scope, count, and consequence before confirmation.
3. Data provenance must be visible: entered by operator, sourced from SKU, calculated, imported, AI suggested, or copied from a historical snapshot.
4. An unknown value is visibly unknown. It is never quietly replaced with a plausible value.
5. The system should prevent invalid states, not merely warn after the state is saved.
6. “Printed” is a business fact, not a button label.
7. A failed action preserves work and provides a recoverable next step.

## Suggested release gates

- **Gate A — Data and safety:** no fallback prices/dates, no allocation overcommit, correct date math, unique IDs, validated writes, import/restore integrity.
- **Gate B — Print correctness:** real barcode/QR, deterministic renderer, correct DPI/orientation, actual fit validation, per-SKU template resolution, test vector fixtures.
- **Gate C — Operator workflow:** accurate Home status, clear batch/allocation selection, proof/release gates, partial-print reconciliation, true history reprint.
- **Gate D — Hardware:** only certified device/protocol pairings show “supported”; all communication result statuses are truthful; local agent tested with real target printer.
- **Gate E — UX and quality:** keyboard/touch/accessibility, error/loading/empty states, responsive behavior, end-to-end tests, deployment/backup/restore rehearsal.
