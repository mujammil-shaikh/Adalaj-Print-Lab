# 16 — Sequential Claude Code Batch Prompts

Run these batches in order. Each prompt is intentionally scoped. Do not jump to a later batch while a prerequisite is broken. Make a commit/checkpoint after each passing batch.

## Batch 0 — Baseline, repo map, and control inventory

**Prompt:**

“Inspect the repository without modifying production data. Read the entire audit handoff. Run the clean install, typecheck, build and any existing tests. Inventory every route/page, panel, dialog, menu, toolbar, button, dropdown, shortcut and mutating data path. Produce a source map with exact current line references and note where audit findings differ from code. Identify demo seed data versus real user data. Do not fix anything yet. Report baseline failures and create a branch/checkpoint.”

**Acceptance:** documented baseline; no unreported file changes; route/control inventory; install/build/test status is truthful.

## Batch 1 — P0 truth and data-safety hotfixes

**Prompt:**

“Fix the highest-risk correctness defects first: remove fallback MRP/date/lot values from production print paths; prevent network/USB/BLE adapter failures from returning success; split printer sent/device acknowledged/physically verified states; fix zero-count fallback logic; prevent a template selected for allocation 1 from being used for another allocation; fix stale SKU state after seed/update. Add domain tests for each. Do not add new printer support or redesign UI yet.”

**Acceptance:** no fake success; no fabricated business values; allocation-specific template resolution; tests for zero/missing values and adapter failures.

## Batch 2 — Domain model, IDs, transactions, and stock math

**Prompt:**

“Create typed domain functions and transactional commands for product+SKU creation, batch+allocation creation/update, duplicate batch, stock/weight conversion, date calculation and count reconciliation. Separate immutable internal IDs from human codes. Enforce uniqueness and referential integrity. Remove hardcoded batch ID and allocation ID reuse. Preserve existing data with a schema migration and backup. Add tests for concurrency/duplicate codes, partial-write failures, invalid units, zero/negative quantities, allocations exceeding raw stock, and month-end dates. Ask for business policy when yield/waste/date rules cannot be inferred.”

**Acceptance:** atomic multi-entity writes; unique identifiers; no hidden forced minimum quantities; consistent stock calculations in all pages.

## Batch 3 — Application structure and state management

**Prompt:**

“Introduce repository interfaces and typed application commands; keep Dexie as the initial persistence adapter. Move domain calculations out of JSX/root callbacks. Add URL routing for primary pages and preserve selected batch/allocation/job context safely. Add common loading/error/empty/saved states. Do not change visual design broadly yet. Ensure browser back, forward, refresh and direct links behave consistently.”

**Acceptance:** UI no longer duplicates business math; commands are testable; routes work; no data loss during route changes.

## Batch 4 — Print jobs, attempts, audit and exact reprint foundation

**Prompt:**

“Add schema-versioned immutable PrintJob snapshots, PrintAttempt records and append-only audit events. Persist job snapshot before dispatch. Store template/product/SKU/batch/allocation/machine/pack/render artifact metadata and checksum. Keep counts separate: requested, transmitted, device accepted, physically verified, good, rejected, remaining. Implement exact reprint from immutable artifact, distinct from reprint with current data. Add migrations and tests proving live edits do not change historical jobs.”

**Acceptance:** history displays real persisted jobs; exact reprint is byte-identical; attempts append; zero remains zero; all critical events traceable.

## Batch 5 — Barcode, QR, raster renderer and geometry correctness

**Prompt:**

“Replace pseudo barcode/QR drawing with real standards-compliant encoders. Define supported symbologies and reject unsupported ones. Standardize the physical mm → device pixel pipeline using independent X/Y DPI, one origin/orientation transform and deterministic async asset loading. Fix BMP headers and row padding, invert/background behavior, symbol support and download-vs-printer transform divergence. Add decode tests and golden raster tests. Ensure preview, file export and print all consume the same resolved job snapshot.”

**Acceptance:** code decoders return exact payload; BMP metadata reflects actual DPI/dimensions; same inputs yield deterministic artifacts; render errors block print.

## Batch 6 — Fit engine, pass planner and multi-pass export

**Prompt:**

“Refactor fit and pass planning into pure functions with explicit constraints: template canvas, pack window, machine print width/travel, margins, feed direction, selected object IDs and barcode quiet zones. Fit selected modifies only selected objects; fit all is a separate command. Remove hardcoded 3-column/20mm/35mm assumptions unless represented as a named profile setting. Handle zero objects safely. Make exporter consume the exact pass plan and create one artifact per pass with consistent manifest/checksums. Add edge-case and property-based tests.”

**Acceptance:** planner and exported file count agree; no negative travel; no object silently clipped; pass artifacts are reproducible.

## Batch 7 — Print adapter truth and supported-device architecture

**Prompt:**

“Define a transport adapter interface with explicit capabilities and truthful result states. For USB/BLE, implement only known printer profiles and real initialization/acknowledgement protocol. For raw network printing, build or specify a local print agent; browser fetch/no-cors cannot be used as raw TCP. Remove unsupported paths from active UI or mark them as download-only/unsupported. Add reconnect, timeout, cancellation semantics, diagnostic logs, idempotent retry and adapter tests. Do not claim device compatibility without a physical test.”

**Acceptance:** each advertised transport has documented tested hardware/protocol; any failure never reports success; unsupported device blocks dispatch.

## Batch 8 — Designer canvas and inspector repair

**Prompt:**

“Refactor Designer into testable modules: canvas viewport, layer tree, selection model, object renderers, toolbar, inspector sections, data bindings, asset manager and save/version controller. Add multi-select, layer reorder/visibility/lock, snap/grid/guides, zoom-to-fit, actual rotated bounds, undo/redo, keyboard nudging, pointer support and explicit dirty/autosave status. Ensure contenteditable/input focus suppresses canvas shortcuts. Implement real symbol rendering or block unsupported type. Add accessible object list so canvas is not the only way to operate. Preserve physical mm geometry.”

**Acceptance:** all object types render; fit/selection are scoped; save/reopen stable; keyboard and screen-reader workflows exist; undo/redo reliable.

## Batch 9 — Page-by-page UX implementation

**Prompt:**

“Use page specs 03–09 and global UX spec 12 to improve Home, Products, Batches, Designer, Print, History, Settings, AI and shell. Every visible control must be catalogued with its action, validation, pending/disabled/error/success behavior and accessibility name. Remove decorative inert controls. Implement responsive page states, safe dialogs/drawers, clear status words and inline error recovery. Do not change business rules without policy decisions.”

**Acceptance:** control inventory complete; no clickable div controls; keyboard-only critical paths; visual/responsive test matrix passes.

## Batch 10 — AI and action registry

**Prompt:**

“Either convert Copilot into an honestly labeled guided/rule-based assistant or implement a real model through a secure backend proxy. Never expose model secrets in client bundle. Define typed proposals, assumptions, affected records, before/after, validators, approval state and idempotent execution. Applying a proposal must execute a real domain command and verify persisted results. Register visible/keyboard/palette actions in one source of truth; detect shortcut conflicts and restore defaults correctly.”

**Acceptance:** no fake live-AI claim, no auto-applied production mutations, action parity across button/palette/shortcut.

## Batch 11 — Settings, backup/restore and profile calibration

**Prompt:**

“Complete machine/pack profiles and calibration. Every displayed configuration must be editable, versioned, validated and consumed by the appropriate renderer/adapter. Remove or properly wire screen-scale factor. Build complete schema-versioned backup with checksums, media and print evidence; restore dry-run, schema migrations, conflict policy and transaction rollback. Add tests for corrupt/partial backups and interrupted restore.”

**Acceptance:** calibration affects the intended subsystem; complete backup/restore is verified; no partial restore on error.

## Batch 12 — History, operator reconciliation and shell finishing

**Prompt:**

“Complete history filters, job detail, exact/current-data reprint distinction, audit events, search, paging and export. Finish router/deep links, guided-tour anchors, PWA install/update and honest local/offline/sync states. Test every command from palette and contextual strip. Do not claim immutable audit unless append-only storage/integrity properties exist.”

**Acceptance:** history answers who/what/when/how many/which device; exact output preserved; shell actions share callbacks and work from keyboard.

## Batch 13 — Full regression, usability and release gate

**Prompt:**

“Run the full strategy in 13_TEST_STRATEGY_AND_ACCEPTANCE.md. Fix all P0/P1 failures, perform responsive/a11y smoke tests, complete physical test matrix for every claimed printer model/media/profile, execute restore drill and security review. Conduct observed operator sessions. Update defect matrix with evidence/test names. Prepare operator quick start, troubleshooting, supported hardware matrix, known limitations and release report. Do not mark untested hardware or workflow as passed.”

**Acceptance:** all release gates met or clearly blocked with named evidence and residual risk. Provide commands/results and exact remaining issues.

## Batch execution discipline

- One batch per branch/commit where possible.
- Keep diffs focused and reviewable.
- Run smallest relevant test during development, all tests at batch end.
- If a batch uncovers a prerequisite issue, stop and fix it before continuing.
- Update traceability matrix for every change.
- Never bypass TypeScript or tests with broad `any`, `@ts-ignore`, disabled lint or deleted tests without explicit justification.
