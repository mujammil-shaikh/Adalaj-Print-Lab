# 15 — Master Instructions for Claude Code

> Paste this prompt into Claude Code from the root of the extracted `adalaj-label-studio (1).zip` project. Keep all numbered handoff files available in the workspace.

---

You are the senior product engineer, UX architect, QA lead and production-systems engineer responsible for repairing and improving **Adalaj Label Studio**. The supplied repository is the source of truth. The goal is a safe, understandable, fast and dependable production label application for real operators—not a superficial redesign and not a generic template editor.

## Non-negotiable instructions

1. **Inspect before editing.** Read `00_MASTER_INDEX_AND_HOW_TO_USE.md` through `17_DEFECT_TRACEABILITY_MATRIX.md`. Inspect the relevant source files and current Git status before each batch. Never assume the handoff line numbers still match.
2. **Keep the app runnable.** Work in small batches. After each batch run the relevant tests, TypeScript check and build. Do not make a sweeping rewrite that leaves the project broken.
3. **Protect data.** Do not delete or overwrite user data, real product definitions, templates, batch history, print jobs or media. Add migrations and backups before schema changes. Never run destructive scripts against a real database without an explicit dry run and human approval.
4. **Never fabricate production values.** Remove fallback MRP, arbitrary dates, fake lot/SKU IDs, default-success transport states and hardcoded example data from production paths. Demo fixtures must be clearly isolated from real records.
5. **Do not invent printer compatibility.** A printer is supported only when its protocol, profile and physical output are tested. Unsupported transport must fail clearly. A browser `no-cors` call is not proof of raw TCP printer communication.
6. **Do not fake barcode/QR.** Use standards-compliant encoders and decode generated output in automated tests. If a symbology is not supported, block printing and explain why.
7. **Use one source of truth.** The same domain command must power a visible button, command palette, keyboard shortcut and other invocation. The same render pipeline must power preview, download and print output.
8. **Every action is real.** A button must do exactly what its label says, expose disabled reasons, handle pending/error/success, and persist/verify state. Do not leave decorative/inert controls that look active.
9. **Accessible by default.** Use semantic controls, keyboard support, focus management, readable contrast, explicit labels and screen-reader status. Do not use clickable `div`s as buttons.
10. **Do not claim tests passed unless you ran them.** Report commands, output, environment limitations and untested physical hardware honestly.

## Product outcome

An operator must be able to safely: select a verified product/SKU; create a batch; allocate available quantity across SKU/pack sizes; verify mass balance and dates; choose the correct template and pack/machine profile; design or adjust a label; run preflight; send output through a supported transport; see truthful device acknowledgement; physically verify output; reconcile good/rejected/remaining labels; and reopen the exact historical job later.

A designer/engineer must be able to edit geometry predictably, select and manage layers, undo/redo, fit selected objects without changing other objects, see printable boundaries, calibrate pack/machine profiles, save versioned templates, and test physical dimensions.

## Required workflow before implementation

### A. Establish baseline
- Record Git status and create a feature branch.
- Inspect `package.json` and lockfile. Use the intended package manager and exact lockfile.
- Install dependencies cleanly. If install fails, record exact error and do not invent a successful build.
- Run TypeScript check and production build; capture baseline issues.
- List all screens, dialogs, popovers, buttons, menus, keyboard actions and domain write paths. Update `17_DEFECT_TRACEABILITY_MATRIX.md` when actual behavior differs from the brief.

### B. Build an implementation map
For every defect, record: ID, evidence path, risk, owner/module, task, migration need, test, status. Separate confirmed defect from desired improvement. Ask before changing any business rule not derivable from the code/domain, especially expiry policy, MRP policy, waste/yield and partial-print reconciliation.

### C. Implement in order
Follow `16_CLAUDE_CODE_BATCH_PROMPTS.md`. P0 correctness/data/print truth comes before visual polish. Keep each batch reviewable and produce a concise changelog.

## Required architecture principles

- UI components do not own database invariants or print protocols.
- Put business rules in typed domain functions/application commands.
- Use repository interfaces and explicit persistence adapters.
- Use DB transactions for multi-record writes and uniqueness constraints for IDs.
- Represent absent values as absent; do not hide invalid state with display fallbacks.
- Store dates as calendar dates or timezone-aware instants intentionally; do not let `toISOString()` shift local dates.
- Keep printed/acknowledged/physically verified quantities separate.
- Create immutable print-job snapshots and append-only attempts/audit events.
- Introduce a local print agent for raw TCP and device-specific protocols. Browser APIs may be used only where device profiles and browser support are real and tested.
- Keep API secrets out of Vite client variables and browser bundles.
- Use schema versioning, migrations, backup/restore and audit retention.

## Required UX principles

- Home is an operational dashboard, not a decorative analytics screen.
- Products makes SKU/MRP/pack values auditable and safe.
- Batches makes mass balance explicit and blocks invalid allocations.
- Designer supports layer management, keyboard and mouse, exact physical dimensions and a clear dirty/saved state.
- Print Center has a strong preflight gate and honest transport/job states.
- History preserves immutable evidence and distinguishes exact reprint from reprint using current data.
- Settings only exposes capabilities that are actually implemented and consumed.
- AI suggestions are proposals, never unreviewed mutations.

## Definition of done for every batch

- TypeScript types describe all new state and errors.
- Domain validation is covered with unit tests.
- UI pending, disabled, error, empty and success states work.
- Keyboard and accessibility behavior is verified.
- No regression in existing critical workflows.
- Relevant test, typecheck and build commands run successfully, or failure is reported.
- Data migration and rollback/backup implications are documented.
- Traceability matrix marks defect fixed only when a test demonstrates it.

## Deliverables expected from this coding task

1. Working application with no fake success, fake symbols or fabricated print values.
2. Automated unit, component and end-to-end test suites.
3. Versioned data schema and migrations.
4. Print-job, attempt and audit model.
5. Documented supported printer matrix and local print agent design/implementation as appropriate.
6. A page-by-page interaction audit with every control mapped to a real action.
7. Updated operator quick-start, troubleshooting and backup/restore documentation.
8. Traceability matrix with status and exact test references.
9. A final report listing files changed, migrations, commands run, results, supported/unsupported features and remaining risks.

## Stop conditions

Stop and ask for product-owner decision (do not guess) when a change requires a domain policy not present in source: legal label content/format, date expiry rules, MRP rounding/currency tax conventions, pack-weight tolerance, yield/waste rules, regulatory barcode standard, printer model/protocol, operator roles or data retention. Continue safely with unrelated tasks and mark the unresolved policy as a blocker.

Begin with baseline inspection. Do not immediately rewrite the app.

---
