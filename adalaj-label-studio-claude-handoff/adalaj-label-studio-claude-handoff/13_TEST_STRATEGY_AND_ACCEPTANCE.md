# 13 — Test Strategy and Release Acceptance

## Baseline verification limitation
Dependency installation in this audit environment timed out; no `node_modules` directory was available. Therefore no actual Vite build, TypeScript check, browser run, automated test suite or physical printer test was completed. This is explicitly unverified, not a pass. The project currently declares no test script/test framework.

## Add test infrastructure

- Unit/domain: Vitest + TypeScript.
- React components: React Testing Library + user-event.
- Browser end-to-end: Playwright.
- Raster and archive tests: Node test environment with deterministic fixtures; use image comparison with documented tolerance.
- Device integration: mock adapters plus a physical compatibility test bench for each supported model.
- Static quality: TypeScript strict mode, ESLint, formatting and dependency/security audit.

## P0 release-blocking test suites

### Business data integrity
- Missing MRP cannot silently become a print-ready amount.
- SKU code and batch number uniqueness enforced under concurrent creation.
- Product+SKU create is atomic; simulated second-write failure leaves no partial product.
- Batch+allocation create/update is atomic.
- Allocations cannot exceed raw stock unless policy accounts for waste/yield.
- Date parsing is timezone-stable; month-end expiry calculation behaves as intended.
- Zero quantity remains zero; negative/NaN/Infinity rejected.
- Duplicate batch creates new unique allocation IDs and valid foreign keys.

### Printing and transport
- Adapter error, timeout, permission denial and disconnect never return success.
- Unknown transport result is `unknown`, not completed.
- Print job is persisted before dispatch and idempotency prevents accidental duplicate request.
- Acknowledged count is separate from physically verified count.
- Unsupported printer profile blocks dispatch.
- Exact reprint uses stored artifact checksum.
- Barcode/QR decoder returns the exact intended data.
- Multi-pass exporter creates exactly one output per pass and a matching manifest.

### Raster/geometry
- BMP header resolution matches active X/Y DPI and exact dimensions.
- Row padding, bit depth and image size are valid.
- Render, download and print paths use same transform pipeline.
- Images loaded asynchronously are included; render failure surfaced.
- Rotated object bounds and print-window constraints validated.
- Fit selected modifies only selected objects.
- No negative/zero geometry passes readiness.
- Pass planner handles zero, one and many objects without negative travel or phantom passes.

## P1 workflow and UI tests

1. Create product and valid SKUs → verify persistence after reload.
2. Search/select SKU → edit MRP → verify field-level validation, audit and no stale values.
3. Create batch → allocate multiple pack sizes → mass balance → save → reload.
4. Choose a non-first allocation → print view must use its own SKU/template.
5. Designer select, move, resize, rotate, edit binding, undo/redo, save, reopen.
6. Save failure preserves editor changes and shows recovery.
7. Print preflight blocks every invalid condition and links to the right repair control.
8. Start print → simulate success/failure/timeout → inspect attempt states and quantity.
9. History exact reprint remains identical after changing live product/template.
10. Import backup in dry run; invalid data rejected without partial mutation; restore successful backup.
11. Shortcut rebind changes real dispatch; conflicts rejected; inputs do not trigger global shortcuts.
12. Command palette invokes same action as visible button.
13. Route refresh/back/deep-link restores selected entity or reports clear recovery.
14. Keyboard-only and screen-reader smoke test every page.

## E2E acceptance journeys

### Operator happy path
Login/pick workspace (if auth enabled) → select product/SKU → create batch and allocations → confirm mass balance → open exact allocation in Designer/Print → pass preflight → send to supported printer → review device response → verify physical output → reconcile good/rejected labels → history shows exact snapshot and output.

### Recovery journey
Printer disconnects during transfer → app records failed/unknown attempt → operator reconnects → retry policy warns against duplicate output → second attempt recorded → physical count reconciled without silently doubling completed quantity.

### Engineering journey
Designer changes layout → fit validation identifies overflow → operator fixes object → generate test label → compare physical dimensions → version pack/machine calibration → print production job.

### Backup journey
Create backup → corrupt a copy intentionally → dry run rejects it and leaves database unchanged → restore known valid backup → verify products, SKUs, templates, media, settings, print jobs and audit records.

## Release gates

- All P0 tests pass.
- Typecheck, lint and production build pass from a clean install.
- No unresolved high/critical dependency vulnerabilities without documented mitigation.
- No false-success path remains in print adapters.
- All supported printer/media combinations have recorded physical acceptance results.
- Barcode/QR output passes decode tests at minimum intended print size and contrast.
- Backup restore drill completed on a separate environment.
- Operators complete observed workflow without unhandled blocking defects.
- Release notes list known limitations and supported environments.
