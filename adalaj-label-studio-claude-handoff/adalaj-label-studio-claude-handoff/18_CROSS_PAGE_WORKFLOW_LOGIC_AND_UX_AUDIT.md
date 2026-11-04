# 18 — Cross-Page Workflow Logic & Operator UX Audit

**Audit target:** `adalaj-label-studio (1).zip` — extracted React/Vite source  
**Audit date:** 4 November 2026  
**Purpose:** identify failures that only become visible when an actual operator moves across pages and performs a complete job. This supplements the page-by-page audit. It is not a claim that a physical printer has been tested.

> **Core finding:** the application currently behaves like a collection of screens with overlapping selections, rather than one coherent production workflow with a single, explicit job context. Some visible actions lose context during navigation, some controls change local preview state without changing the underlying production context, and some success/status labels are not supported by persisted evidence.

## 1. Operator outcome the product must guarantee

An operator should be able to:

1. Find or create the correct product and pack SKU.
2. Create a manufacturing batch with a unique batch/lot identity, correct date rules, correct MRP, and physically valid allocations.
3. Open a specific allocation and know which product, pack size, template version, machine, and data will be used.
4. Preview the same result that will be exported or sent to a printer.
5. Perform preflight checks, create a proof, verify it, and dispatch a production quantity.
6. Reconcile actual accepted/good/rejected quantities without overstating completion.
7. Reopen history and reproduce the original output, or explicitly choose a new-data reprint.
8. Recover safely from failures, interruptions, duplicate clicks, device disconnects, and browser reloads.

Every page and action must preserve that job context. A user should never have to infer which product, SKU, allocation, template, or printer is active.

## 2. Confirmed cross-page defects

Severity: **P0** = can cause wrong product/label/data, false production record, or data loss; **P1** = materially breaks workflow or creates misleading state; **P2** = significant usability/configuration defect.

| ID | Severity | Where | Confirmed behavior in submitted source | Operator consequence | Required correction |
|---|---|---|---|---|---|
| WF-001 | P0 | Batches → Print; `src/components/batches/BatchesView.tsx:467–473`, `src/App.tsx:652–655` | Allocation-row Print calls `onNavigateToPrint(currentBatch, alloc.id)`, but the App callback ignores `allocId`. | The operator clicks Print for one pack size but can land on another allocation. | Pass a typed `{ batchId, allocationId }` print context and make it the source of truth on the Print page. |
| WF-002 | P0 | App → Print; `src/App.tsx:701–716`, `src/components/print/PrintView.tsx:80–101, 474–493` | The App resolves the template from `printBatch.allocations[0]`. PrintView separately lets the operator select another allocation, but the template prop is not re-resolved when that local selection changes. | The displayed SKU/values can change while geometry/template still belongs to allocation 1. Wrong-size or wrong-product artwork can be exported. | Resolve template, pack profile, SKU, field values, and validation from the *same selected allocation* whenever selection changes. Do not keep these as independent selections. |
| WF-003 | P0 | Print completion; `src/components/print/PrintView.tsx:401–405, 1185–1191`, `src/App.tsx:541–560` | “Mark Packs Printed” immediately marks the full `expectedPacks` count as printed. It is not gated by a successful transmission, device acknowledgement, physical proof, or actual quantity. | A click can complete an allocation and batch even if nothing was printed or only part was printed. | Replace manual completion with a job lifecycle and quantity reconciliation. Acknowledge/verified quantities must be evidence-based; permit partial output and rejects. |
| WF-004 | P0 | Home → Product/Batch context; `src/components/home/HomeView.tsx:58–91, 194–210` | Preview SKU is local state and is initialized only once. The selector contains SKUs from every product. Changing active batch/product does not automatically reconcile the selected preview SKU to that product. | Product/batch values can be combined with a SKU/MRP/net weight from a different product. | Filter SKU choices by current product and derive or explicitly synchronize selected SKU whenever product/batch context changes. Show a visible product/SKU/batch identity strip. |
| WF-005 | P0 | Batch creation; `src/components/batches/BatchesView.tsx:153–154, 190–215, 218–227` | Allocation totals may exceed raw input. Remaining loose is clamped to zero, and the persisted `rawMaterialKg` is silently increased to `Math.max(rawKgInput, totalAllocKg)`. | The system silently rewrites the entered production quantity rather than telling the operator the allocation is impossible. The notes still refer to original input. | Block over-allocation with an explicit validation error. Never mutate the operator's raw input to make an invalid plan appear valid. Record waste/yield only through an explicit business rule. |
| WF-006 | P0 | Batch creation; `src/components/batches/BatchesView.tsx:190–198` | `expectedPacks` is forced to at least one, even where the allocated material is less than one full pack. MRP falls back to a guessed formula or fixed amount. | The app can invent a pack count or MRP rather than revealing insufficient material/missing price. | Zero is a valid calculated result; block print until SKU, pack weight, MRP and date data are valid. Never infer commercial values. |
| WF-007 | P0 | Batch IDs; `src/components/batches/BatchesView.tsx:92–112, 167–168`; History duplicate `src/App.tsx:734–742` | ID generation uses a hard-coded initial sequence number of 13. History duplication assigns fixed `ADTP015` or `BAT015`, regardless of existing IDs. | ID collisions can overwrite existing batches because persistence uses `put`. | Use a persistent, collision-safe ID/code allocator; enforce uniqueness in a transaction; show conflict and do not overwrite. |
| WF-008 | P0 | History → Duplicate; `src/App.tsx:734–742` | Duplicate spreads the source batch and changes only batch ID/date/status. Existing allocation IDs and each allocation's `batchId` remain from the original batch. | New batch has inconsistent internal references and can collide with old allocation IDs. | Create new allocation IDs and update every allocation's `batchId`; copy only explicitly selected fields; require a new lot date and revalidate MRP/shelf-life snapshots. |
| WF-009 | P0 | History → Reprint Exact; `src/components/history/HistoryView.tsx:141–148`, `src/App.tsx:730–733`, `src/App.tsx:701–716` | “Reprint Exact” only selects a batch and routes to the normal Print page. Current templates/machine state are used; no complete immutable print-job artifact is read. | The operator is promised an exact reproduction but may print a different design, machine transform, or values. | Build persisted immutable PrintJob snapshots and a separately named “Reprint with current design/data” path. Exact reprint must use the original artifact and its checksum. |
| WF-010 | P1 | History metrics; `src/components/history/HistoryView.tsx:118–120` | `packsPrinted || expectedPacks` substitutes expected count whenever actual count is zero. | History can show unprinted packs as printed. | Display actual printed count only. Render “not recorded” separately from zero if legacy records are incomplete. |
| WF-011 | P1 | Home status; `src/components/home/HomeView.tsx:182–190` | “Ready to Print” is a static badge, not derived from SKU MRP, batch allocation, template quality, printer capability, or proof status. | Operator receives a false readiness signal. | Readiness must be calculated from a shared preflight validator and show blockers/warnings with links to fix them. |
| WF-012 | P1 | Home CTA; `src/components/home/HomeView.tsx:161–169` | “Start New Batch” only navigates to Batches; it does not open the new-batch wizard. The visible `N` shortcut is not dispatched by the global key handler. | The action's label and behavior disagree; operator must find another button. | Make the CTA open the creation flow, or relabel it “Open Batches”. Wire `N` only when safe and not typing. |
| WF-013 | P1 | Batches → Print; `src/App.tsx:645–655, 673–691` | Selecting a batch updates active product but does not synchronize active SKU, pack profile, or active template. | Header/editor context can describe a different SKU or geometry from the selected batch. | Store one canonical selection context; derive product/SKU/pack/template from selected batch+allocation rather than separately mutable state. |
| WF-014 | P1 | Add allocation from loose stock; `src/components/batches/BatchesView.tsx:237–265` | New allocation uses today's MFD, a fixed best-before date, and fallback MRP 50 instead of inheriting the batch lot date/product shelf life/SKU MRP. | One batch can have allocations with contradictory manufacturing/expiry dates and invented MRP. | Derive dates from the parent lot and SKU shelf-life rules; require explicit override reason; never use fixed date/price fallbacks. |
| WF-015 | P1 | Products → Batch wizard; `src/components/batches/BatchesView.tsx:122–140, 158–165` | New batch wizard always preloads 100 g and 500 g allocations with fixed MRPs, even when a selected product may allow different sizes or lack those SKUs. | Wizard presents invalid defaults and nudges operators toward unsupported pack formats. | Build allocation choices only from enabled SKUs for the selected product; prefill MRP from the SKU as a suggestion with provenance, not a hard-coded value. |
| WF-016 | P1 | Batch → active selection; `src/App.tsx:428–445, 640–655` | Creating/selecting a batch changes the active batch/product but does not consistently update active SKU/template/pack context. | Stale context persists across pages and causes wrong previews or print setup. | Replace scattered active* state with a validated `WorkspaceContext` keyed by IDs; reset/reconcile dependent selections atomically when parent selection changes. |
| WF-017 | P1 | Settings → keyboard; `src/components/settings/SettingsView.tsx:127–136`; `src/App.tsx:344–400` | The shortcut editor updates `actionRegistry`, but the global keyboard dispatcher hard-codes shortcuts such as Alt+1–7, Ctrl+K, Alt+A and F1. | UI can say a shortcut was remapped, while the old key continues to execute and the new one does nothing. | Keyboard dispatcher must execute the same registered action definitions used by palette, shortcut list and contextual strip. No second hard-coded mapping. |
| WF-018 | P1 | Settings → screen calibration; `src/components/settings/SettingsView.tsx:99–103, 553–588` | Saving calibration only writes a localStorage factor and displays success. The reference line remains fixed at 100 mm CSS pixels; the codebase has no consumer of `als_screen_scale_factor`. | The confirmation claims 100% canvas scale is calibrated although the saved value does not affect the canvas. | Either implement and test the calibration in the relevant screen-preview subsystem or remove the claim/control. Distinguish screen scale from physical print dimensions. |
| WF-019 | P1 | Settings → measurement wizard; `src/components/settings/SettingsView.tsx:79–84, 105–125` | Text height is editable in the wizard but only written into a free-text note; it is not applied to the pack profile's caption-row/object measurements. | The operator believes text height was calibrated when the actual layout is unchanged. | Persist a typed measurement field and apply it to the appropriate caption/object profiles; otherwise remove the editable field and message. |
| WF-020 | P1 | Settings → backup/restore; `src/components/settings/SettingsView.tsx:139–160, 163–194` | Export stores `business` (singular), while import looks for `businesses` (plural). Export and import omit `mediaProfiles` and `printJobs`. Restore uses `bulkPut`, which merges rather than replacing/fully reconciling the database. | A claimed full backup may omit business/media/print evidence; restore can leave stale records in place. | Use a schema-versioned canonical export manifest for every table; validate, dry-run, show diff, then restore atomically with explicit replace/merge policy and rollback. |
| WF-021 | P1 | Settings → selected machine; `src/App.tsx:104–108, 748–764` | Active machine initializes to `machs[0]` after load; selection is only component state and is not persisted as the selected profile ID. | The operator can configure/select a machine but lose that choice on reload. | Persist active machine ID in validated app settings; restore it only if the profile still exists and is enabled. |
| WF-022 | P1 | Designer → global template inheritance; `src/components/designer/DesignerView.tsx:159–183, 825–910` | Template resolution and local editor template are managed separately; product/SKU/template list changes can reset local editor state and history. Save scope defaults based on current inheritance source. | Users may lose undo context or unintentionally save a SKU design as a global pack default. | Show explicit target scope and affected products before saving; make scope choice mandatory for global-impact changes; preserve dirty/undo state through save and selection changes. |
| WF-023 | P1 | AI Copilot → Apply; `src/App.tsx:807–829` | Apply handler only writes orientation/layout changes. It still logs `approvedChanges.length` as applied even if other approved proposal categories were not executed. | AI panel can claim changes were applied when only a subset changed. | Each proposal must map to a typed domain command; reject unsupported proposals visibly; log applied/rejected counts and verify persisted after-state. |
| WF-024 | P1 | Print proof workflow; `src/components/print/PrintView.tsx:421–433, 401–405` | Proof status is a freely editable local select. It is not persisted, tied to a proof artifact, or gated by an actual test print/verification. Mark Printed unconditionally changes it to Production Ready. | Status can be advanced without completing the evidence-producing workflow; it disappears on remount/reload. | Derive proof status from persisted events: not tested → test dispatched → proof captured → operator verified → production approved. Never allow direct dropdown jumps. |
| WF-025 | P1 | Print export package; `src/components/print/PrintView.tsx:305–353` | Export writes one rendered file pair (`Pass 1 of 1`) while manifest metadata receives `passPlan.totalPasses`. | Manifest may claim multiple passes while ZIP contains only one pass artifact. | Render/export every `passPlan.passes` entry or explicitly block multi-pass export until supported. Manifest must be generated from actual artifacts. |
| WF-026 | P2 | Batches navigation; `src/components/batches/BatchesView.tsx:305–309` | UI says “Use ↑ ↓ to navigate”, but the component has no corresponding list keyboard navigation handler. | Keyboard-first users are promised a behavior that is not implemented. | Implement roving focus/arrow-key navigation with Home/End and announced selection, or remove the instruction. |
| WF-027 | P2 | Batch creation feedback; `src/components/batches/BatchesView.tsx:230–234` | Creation success toast is shown immediately after `onCreateBatch` is called; the callback is async but not awaited by the caller. | A persistence failure can be followed by a success message. | Await mutation result; display success only after transaction commit; handle validation, write failure and retry. |
| WF-028 | P2 | App bootstrap; `src/App.tsx:113–158` | Seed MRP repair writes `verifiedSkus` but app state is set from original `skuList`. | UI can still show pre-repair values until a later reload, causing inconsistent values between DB and memory. | Set state from the exact persisted/verified result and use one repository refresh path. |

## 3. The structural cause: fragmented selection state

The root component maintains independent values for `activeBatch`, `activeProduct`, `activeSku`, `activePackProfile`, and `activeTemplate` (`src/App.tsx:79–83`). Different pages also maintain their own local selections, such as Home's `selectedPreviewSkuId` and PrintView's `selectedBatchId`/`selectedAllocId`.

This produces multiple competing definitions of “current work”. The application must stop treating these five objects as unrelated global variables.

### Recommended canonical context

Use IDs, not copied domain objects, as the selection source of truth:

```ts
interface WorkspaceContext {
  route: 'home' | 'products' | 'batches' | 'design' | 'print' | 'history' | 'settings';
  productId?: string;
  skuId?: string;
  batchId?: string;
  allocationId?: string;
  templateId?: string;
  machineProfileId?: string;
  packProfileId?: string;
  printJobId?: string;
}
```

Rules:

- Batch selection sets the product automatically.
- Allocation selection sets the SKU and pack profile automatically.
- Template is resolved from product + canonical pack size + scope/version policy.
- The print page may not silently fall back to `allocations[0]` when an explicit allocation ID was supplied.
- If a selection is invalid, show a recovery prompt; do not silently choose a different record.
- Only one store owns this context; page-local state is for transient UI (open drawer, zoom, search), not a second copy of business selection.
- Every route transition must preserve the context needed by the destination.

## 4. Rebuild the actual operator workflow as explicit state machines

### 4.1 Batch lifecycle

Recommended states:

`Draft → Validated → Open → In Progress → Partially Completed → Completed → Archived`

Rules:

- `Draft`: editable plan; no production commitment.
- `Validated`: unique batch code; product/SKU active; MRP and dates valid; allocation sum does not exceed raw material; expected pack counts calculated.
- `Open`: approved batch available to print.
- `In Progress`: at least one persisted print attempt exists.
- `Partially Completed`: actual good + rejected + remaining counts are reconciled and incomplete quantity remains.
- `Completed`: all allocations reconciled to approved production policy; zero unexplained quantity variance.
- `Archived`: read-only operational record, not a synonym for completed.

Do not derive Completed merely from a Boolean `printStatus === 'Printed'` if counts are absent.

### 4.2 Allocation lifecycle

Track quantity fields independently:

- `plannedPacks`
- `requestedPacks`
- `transmittedPacks`
- `deviceAcceptedPacks`
- `goodPacks`
- `rejectedPacks`
- `remainingPacks`
- optional `varianceReason`

A failed/unknown transmission must not increment good packs. Retry must be idempotent or produce a separate attempt record so an operator cannot accidentally double-count.

### 4.3 Print job lifecycle

Recommended flow:

`Draft → Preflight Failed | Preflight Passed → Proof Required → Proof Awaiting Review → Proof Approved → Queued → Transmitting → Device Acknowledged → Production In Progress → Reconciled → Completed`

Failure branches must include `Failed`, `Timed Out`, `Cancelled`, and `Unknown Outcome`.

Key behavior:

- Save immutable job snapshot before transmission.
- Keep job identity independent of a live template or current page selection.
- Show requested quantity and whether the transport can actually dispatch that quantity or only transfer a bitmap file.
- `Device Acknowledged` is not the same as `Physically Verified`.
- Proof approval must be a deliberate operator event with timestamp/user/artifact.
- No arbitrary dropdown may advance a state.

### 4.4 Reprint actions must be explicit

Provide two different commands:

- **Reprint exact original** — uses immutable original values, template snapshot, machine transform and original rendered artifact; creates a new attempt linked to original job.
- **Create new print from current data** — previews current MRP/date/template/machine and requires new preflight/proof as policy requires.

Never label a current-data print as “Exact”.

## 5. Page-by-page workflow/UX redesign rules

### Home

- Replace the static “Ready to Print” badge with live readiness derived from current batch/allocation and shared preflight.
- Separate “Create batch” (opens wizard) from “Open batches” (navigates to list).
- Make live preview clearly say **Sample preview** unless tied to a real selected allocation.
- Preview SKU selector must be filtered to the selected product, and MRP/date/lot values must come from a real saved SKU/allocation or be visibly marked sample/blank.
- The selected context strip must show Product → SKU → Batch → Allocation → Machine.

### Products & SKUs

- Product creation should not imply a SKU is production-ready when required pack weight, MRP, unit and shelf-life policy are missing.
- Show enabled/archived status, missing required fields and which templates apply.
- Changing SKU master data must not silently rewrite existing batch snapshots; show that existing allocations retain their historical MRP/date snapshots.
- Validate normalized pack-size uniqueness (`100 g`, `100g`, `0.1 kg`) and canonical weight conversions.

### Batches

- Wizard begins with product selection, then only that product's enabled SKUs.
- Show raw material, allocated material, expected packs, residual, and any configured yield/waste as separate numbers.
- Reject over-allocation; do not clamp away invalidity or inflate raw stock.
- Require a real MRP source (SKU current value or explicit batch override), record source, and block when unknown.
- Calculate shelf life with a tested calendar-month policy and account for SKU override.
- Each row's Print action must preserve its allocation identity.
- Batch-level Print must first show a clear allocation selection/queue summary if several pack sizes exist.
- Add allocation from loose material must use parent-lot MFD and correct shelf life unless explicitly creating a new sub-lot.

### Designer

- Display the product/SKU/pack scope and inheritance source next to the canvas at all times.
- Before save, state exactly: “This SKU only”, “All SKUs with this pack size”, or another explicitly defined supported scope, plus count of affected SKUs.
- Do not make the primary Save button silently global because a global template happened to be resolved.
- If switching product/SKU with unsaved edits, ask Save / Discard / Cancel; preserve undo history within each editing session.
- Save template geometry separately from values, but print preview must resolve values from the selected allocation context.
- A `templateVersionSnapshot` must identify an actual immutable template version, not a manually copied constant.

### Print Center

- Show a fixed job-context summary and prevent selection drift.
- Resolve allocation-specific template, pack, SKU and values as a single operation.
- Separate actions: Preflight, Download artifact, Send to device, Record proof, Reconcile quantity. Do not place one “Mark Printed” action as a substitute for the process.
- Make transfer modes honest: removable USB file export is not a printer connection; configuring an IP is not connecting; device connection is not a completed print.
- Multi-pass plan and exported pass files must agree exactly.
- Display actual/reconciled quantity, remaining and reject counts.

### History

- Default view should be production jobs/attempts, not just batches with a Completed flag.
- Search filters should cover job code, batch, product, SKU, operator, date and device.
- Show “Exact reprint” only if an immutable original artifact exists; otherwise show “Create new print from batch data”.
- Display actual printed counts only; zero must remain zero.
- Duplicate batch creates a new unique identity and new allocation IDs, with explicit review of new dates/MRP.

### Settings

- Machine, media and pack profile selection must persist and be visible in Print Center.
- All configurable calibration values must be consumed by the exact subsystem named by the setting.
- Keyboard remapping, command palette, contextual strip and actual key dispatcher must share one action registry.
- Measurement wizards must save the value they expose; notes are not a substitute for typed settings.
- Backup must enumerate all persisted tables and perform validated, atomic restore with a preview.

### AI Copilot

- Show every proposed change with affected record, scope, current value, proposed value, risk and validation result.
- Support only actions mapped to real commands. Unsupported proposals cannot be shown as approved/applicable.
- Apply per change or as one atomic transaction; show applied, skipped and failed counts separately.
- Re-read persisted state before reporting success.

## 6. UI behavior contract for every interactive element

For every button, dropdown, menu item, side panel, tab, modal, shortcut, canvas control and inline editor, Claude Code must document:

1. **Intent:** what the operator believes the control does from its visible label.
2. **Preconditions:** required selected product/SKU/batch/allocation/job/device and required permissions.
3. **Effect:** exact state or route mutation; identify persistent vs transient state.
4. **Validation:** invalid, missing, stale, duplicate, conflicting, out-of-range, and unsupported values.
5. **Pending state:** disable duplicate submits and show progress.
6. **Success state:** report only after the operation actually completes/persists.
7. **Failure state:** preserve inputs, explain cause, offer a safe recovery path.
8. **Undo/reversal:** define whether action can be reversed and how audit history records it.
9. **Keyboard/accessibility:** focus order, accessible name, keyboard operation, escape behavior and focus restoration.
10. **Responsive behavior:** where the panel moves/collapses and whether the same action stays discoverable.

A control is not complete merely because it has an `onClick` handler.

## 7. Mandatory scenario tests (end-to-end)

Claude Code should turn each scenario into an automated test where possible and a manual test where hardware/operator input is required.

| Scenario | Steps | Expected result |
|---|---|---|
| E2E-01 Correct allocation context | Create product with 100 g + 500 g SKUs; create batch with both allocations; click Print on 500 g row. | Print page shows 500 g identity, 500 g template/pack profile, correct MRP/date and allocation ID. No fallback to first row. |
| E2E-02 Multi-allocation switching | Open one batch in Print Center; switch between 100 g and 500 g allocations. | Template, SKU, MRP, net weight, dates, dimensions, quality results and export artifact all switch together. |
| E2E-03 Missing MRP | Create SKU without MRP and create allocation. | No guessed price; explicit blocker; cannot create production-ready print snapshot. |
| E2E-04 Over-allocation | Input 10 kg raw and allocate 12 kg. | Save blocked; raw value remains 10 kg; clear message identifies 2 kg over-allocation. |
| E2E-05 Below-one-pack allocation | Allocate less than one pack's net weight. | Expected packs calculate to zero; system explains insufficient material; no forced pack count of one. |
| E2E-06 Add loose allocation | Allocate remainder from an existing batch. | MFD and best-before follow defined parent-lot/SKU policy; no hardcoded date/MRP. |
| E2E-07 Duplicate batch uniqueness | Duplicate the same batch twice, including after reload and for multiple product prefixes. | Unique batch IDs and allocation IDs; each allocation references the new batch; no record overwrite. |
| E2E-08 Partial print | Send/record only part of planned quantity and record rejects. | Allocation remains partial; remaining count and reject count are visible; batch not falsely completed. |
| E2E-09 Print failure | Disconnect device or force adapter failure. | Job records failed/unknown outcome; good count remains unchanged; safe retry path appears. |
| E2E-10 Proof gating | Attempt to set Production Ready without test print/proof approval. | Not possible; UI names missing evidence and provides next action. |
| E2E-11 Exact reprint | Create job, then edit live template and MRP; exact-reprint original. | Original artifact/checksum and data snapshot are used, not current template/MRP. |
| E2E-12 Current-data reprint | Choose new print from old batch after template/MRP changes. | Clear preview of changed data and new preflight; not labelled exact. |
| E2E-13 Shortcut remap | Change Alt+3 to another key and use both keys. | New key performs action; old key no longer does; palette and help display same mapping. |
| E2E-14 Calibration | Change scale factor and measure preview reference. | Actual on-screen calibration changes only where promised; print output physical geometry remains independently correct. |
| E2E-15 Backup roundtrip | Export, clear test database, restore, compare all tables including business/media/print jobs. | All records roundtrip; schema validated; duplicates handled per explicit restore policy. |
| E2E-16 Product context switch | Select product B after product A in Home, Designer and Batches. | All downstream SKU/template/preview context matches B; no stale SKU from A. |
| E2E-17 Persistence failure | Simulate IndexedDB transaction failure on create/update. | No success toast; UI preserves inputs and reports failure; no partial record set. |

## 8. Required next implementation sequence

This audit should change the order of work in `16_CLAUDE_CODE_BATCH_PROMPTS.md`:

1. **Batch A — Map real workflows and centralize context.** First create a route/context diagram, entity dependency map and explicit source-of-truth store. Do not redesign the UI yet.
2. **Batch B — Repair batch/SKU/ID domain rules.** Normalize sizes, enforce MRP/weight/date/ID rules, prevent over-allocation, fix duplication and transactions.
3. **Batch C — Repair selected-allocation Print pipeline.** Thread batch/allocation/job IDs end-to-end; make every derived value resolve together.
4. **Batch D — Persist print lifecycle and reconcile actual quantities.** Replace manual status jumps with evidence-based job states.
5. **Batch E — Repair history, reprint, backup and settings truth.** Reprint and restore must become reproducible.
6. **Batch F — Rebuild page-level interaction design around these workflows.** Redesign navigation, panels, drawers, tables, selection, empty/error/loading states only after domain flow is reliable.
7. **Batch G — Full E2E acceptance with an actual operator and each claimed printer.**

Do not let a visual redesign change workflow semantics without an explicit test.

## 9. Claude Code execution prompt

Use this prompt before continuing the existing batches:

> Read `18_CROSS_PAGE_WORKFLOW_LOGIC_AND_UX_AUDIT.md` completely. Treat it as a supplement to the source audit, not a generic design wishlist. Re-open the exact source locations listed; verify every finding against the current repository and update line references. First draw the actual operator journeys and state transitions across Home → Products/SKUs → Batches/Allocations → Designer → Print Center → History, including Settings and AI actions. Identify all context handoffs and every place a selected ID is discarded or reconstructed from `active*` state or array index 0. Build a central typed workspace/job context and domain command layer. Fix P0 workflow contradictions before polishing screens. Add regression tests for every E2E scenario above. Never infer or fabricate product, price, date, print quantity, job status, or hardware success. For each control, document user intent, preconditions, persisted effect, pending/success/failure state, recovery, keyboard/accessibility behavior, and responsive behavior. Stop and report any business rule that cannot be inferred; do not silently choose one. Keep the project buildable after each batch, and update the defect traceability matrix with source evidence and test evidence.

---

**Audit conclusion:** the largest UX problem is not color, spacing, or card layout. It is that the interface does not consistently preserve the operator's selected production object through the workflow. Fix that first; then the visual redesign can make the correct workflow understandable instead of merely making the wrong workflow look polished.
