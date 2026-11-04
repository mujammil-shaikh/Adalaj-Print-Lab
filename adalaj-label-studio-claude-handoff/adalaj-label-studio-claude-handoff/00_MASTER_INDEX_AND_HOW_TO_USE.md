# Adalaj Label Studio — Complete Audit & Claude Code Implementation Handoff

**Source archive audited:** `adalaj-label-studio (1).zip`  
**Source directory used:** extracted `adalaj-audit/`  
**Audit date:** 4 November 2026  
**Purpose:** turn the current codebase into a dependable, operator-friendly production label authoring, job preparation, and print-control application.

> This is a source-code audit and implementation brief. It identifies defects that are visible in the submitted source, explains how the product should behave for actual operators, and provides a staged rebuild/repair plan. It is not a claim that the app has been run against a physical printer. Dependency installation timed out in this environment, so a full compile, browser test, and hardware acceptance run were not completed. Claude Code must validate every change with the checks in `13_TEST_STRATEGY_AND_ACCEPTANCE.md`.

## Read order

1. `01_EXECUTIVE_AUDIT_AND_PRIORITY_REGISTER.md` — top risks, severity, and what must be fixed first.
2. `02_PRODUCT_BLUEPRINT_AND_OPERATOR_WORKFLOWS.md` — desired end-to-end product behavior and operator journeys.
3. Page specifications: `03_HOME_AND_PRODUCTS.md`, `04_BATCHES_AND_INVENTORY.md`, `05_DESIGNER_CANVAS_AND_INSPECTOR.md`, `06_PRINT_HARDWARE_AND_EXPORT.md`, `07_HISTORY_AUDIT_AND_REPRINT.md`, `08_SETTINGS_AND_APPLICATION_SHELL.md`, `09_AI_COPILOT_AND_ACTIONS.md`.
4. Platform foundations: `10_ARCHITECTURE_DATA_BACKEND_AND_SECURITY.md`, `11_PRINT_ENGINE_GEOMETRY_AND_RASTER.md`, `12_VISUAL_UX_ACCESSIBILITY_AND_RESPONSIVE.md`.
5. `13_TEST_STRATEGY_AND_ACCEPTANCE.md` and `14_MIGRATION_DEPLOYMENT_AND_OPERATIONS.md`.
6. `15_CLAUDE_CODE_MASTER_INSTRUCTIONS.md`, then execute `16_CLAUDE_CODE_BATCH_PROMPTS.md` in order.
7. Use `17_DEFECT_TRACEABILITY_MATRIX.md` to ensure every finding has an owner, change, and test.

## What is in this handoff

This package contains 18 Markdown files. It covers every route and major UI surface present in the archive: Home, Products & SKUs, Batches, Designer, Print & USB, History, Settings (machine profiles, pack profiles, hardware, calibration, keyboard shortcuts, backup/restore), AI Copilot, header/navigation, command palette, cheat sheet, guided tour, PWA/offline indicator, shared data services, print transform, fit engine, pass planner, local persistence, and the missing production backend boundary.

## Ground rules for implementation

- **The uploaded ZIP is the baseline.** Do not silently replace the product with a generic label editor or invent requirements unsupported by the domain model. Preserve useful behavior, but repair unsafe behavior.
- **Fix correctness before polish.** A beautiful label containing the wrong MRP, wrong dates, invalid barcode, wrong batch, or unverified print status is a failed product.
- **Never fabricate business data.** No fallback MRP, no invented dates, no made-up pack SKU, and no default success result when the printer has not acknowledged a job.
- **Separate authored design from variable data.** Templates define geometry and design. Product/SKU/batch snapshots supply values. Historical print jobs preserve immutable inputs and output.
- **Do not claim universal printer support.** Every printer profile must specify a known protocol, tested dimensions, DPI, feed orientation, media, and acknowledgement behavior. Unsupported combinations should be visibly unsupported.
- **Keep an easy operator path.** Common tasks should be a guided, low-risk flow. Advanced engineering controls should be available without forcing novice operators to understand millimetres, transforms, endpoint numbers, or bitmap headers.
- **Every mutation needs validation, persistence, visible feedback, and an audit record.** Avoid optimistic success toasts before a write has completed.
- **Build incrementally.** Keep the app runnable after every batch. Do not rewrite every page and the print engine in one unreviewable commit.

## Evidence notation

Source references in this package use repository-relative paths and approximate line ranges from the submitted ZIP, for example `src/components/batches/BatchesView.tsx:156–235`. Line numbers may shift after edits. Claude Code should inspect the current file before changing it.

## First engineering action

Create a baseline branch, preserve the submitted ZIP unchanged, install dependencies using the lockfile/toolchain actually intended by the project, run typecheck and build, capture all compile errors, and add automated test infrastructure. The existing `build` script is only `vite build`; the `lint` script is only `tsc --noEmit` despite its name. There are no test scripts or test dependencies declared in the submitted `package.json`.
