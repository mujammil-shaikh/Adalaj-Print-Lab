# 03 — Home Dashboard & Products / SKU Master

## A. Home page (`src/components/home/HomeView.tsx`)

### Current composition

- Platform banner: product title, claimed universal compatibility, active machine geometry and **Start New Batch** CTA.
- Live Production Label Preview card: preview SKU selector, three preview modes (Pouch Mockup / Head Band / 1-Bit Machine Raster), zoom controls, and raster canvas.
- Summary cards for open/completed batches and loose stock, recent batch/list actions, and machine/profile status (see remaining lower portion of the component).

### Confirmed defects

1. **False readiness state.** “Ready to Print” is a static green badge, not derived from product completeness, template validation, selected machine, print profile, or batch state (`HomeView.tsx`, around lines 128–150). Replace it with a computed state (`Blocked`, `Needs data`, `Needs proof`, `Ready`) and a link to the exact blocking issue.
2. **Invented fallback commercial values.** Live preview uses ₹50 and ₹0.50/g when MRP is absent, with hard-coded dates `10/10/26` and `09/11/27`, a fallback batch `ADTP014`, and product/brand defaults (`HomeView.tsx:57–80`). Do not put these values in production previews. Display `MRP missing` or `Choose batch` and render a separate clearly watermarked sample-data mode only when explicitly selected.
3. **SKU can belong to a different product than the active batch.** The selected preview SKU initializes once and is not reset when current product changes; it falls back to `skus[0]`. The global selector iterates all SKUs. Filter options to `currentProduct.id`, repair selection when product changes, and show an explicit empty state if there is no SKU.
4. **Template is not guaranteed to match preview SKU.** Home receives one template prop from global active state and changes only preview SKU values. Resolve the actual template for the preview SKU + pack profile and pass the right machine/media settings.
5. **Loose stock is a misleading aggregate.** The summary sums every batch's raw material and allocation and calls the difference “loose”, clamping negative to zero. This collapses lot-specific loose balances, includes completed/archived lots, and can hide over-allocation. Compute per-batch ledger balances and display aggregate only when the aggregation policy is explicit.
6. **Machine online state is not real hardware state.** A selected profile is not proof of an online device. Show separate labels for “profile selected”, “agent connected”, “device connected”, and “device ready”.
7. **Preview mode names overstate the fidelity.** Pouch Mockup is an illustration unless there is a real pack image + measured transform; Head Band and Raster depend on renderer issues detailed in `11_PRINT_ENGINE_GEOMETRY_AND_RASTER.md`.
8. **Preview catches errors only to console.** Add visible error/retry state and do not leave the last good image displayed as if it represented current inputs.

### Redesign requirements

**First screen hierarchy**
- Top context: current shift/user, active machine/connection, local/offline status, last backup/sync time.
- Main CTA: **Continue current batch** when one exists; otherwise **Create batch**. Secondary: Create product, Open designer, Open print queue.
- Work queue: batches needing data, allocations awaiting template/proof, queued jobs, partial print runs, and failed jobs. Use counts and direct actions.
- KPI cards: Open batches, material in process, jobs awaiting proof, print attempts today, successfully reconciled packs, exceptions. Every metric must drill into its records and disclose time window/filters.
- Recent activity: event stream with user, time, entity, action and current state.
- Small preview: selected allocation with exact values; no editable or inferred defaults on Home.

**Preview interactions**
- SKU selector must be scoped to selected product and label “Preview data only” when no batch is selected.
- If no allocation is chosen, user must select one before production preview.
- Preview controls: Fit, 100% physical preview (only after verified screen calibration), raster/black-white view, safe margins, actual field values toggle. Zoom/pan never alters exported dimensions.
- Show source badge per value: `Batch snapshot`, `SKU master`, `Template text`, `Calculated`, or `Missing`.
- Make the preview read-only on Home; route to Designer or Print Center for editing/production.

### Home acceptance criteria

- [ ] No hard-coded dates, MRP, batch, product or “ready” status can be rendered for a real job.
- [ ] Product, SKU, batch and template always refer to the same valid product/SKU/allocation.
- [ ] Every dashboard count can be traced to a filtered record query with documented status rules.
- [ ] Negative material balance is visible as an exception, never hidden by `Math.max(0, ...)`.
- [ ] Empty, loading, database error and offline-unsynced states are explicit.
- [ ] Every CTA opens the correct workflow and preserves current context.

---

## B. Products & SKUs (`src/components/products/ProductsView.tsx`)

### Current composition / controls

- Header: “Products & SKU Master Matrix”, bulk edit button when selected, Export CSV, Add Product.
- Filter strip: free-text search and Product dropdown.
- Table: select-all checkbox, Product Name, Code, Pack Size, Net Weight, MRP, Rate/g, Status, Actions.
- Inline MRP editor with Save/Cancel; bulk MRP modal; Add Product modal (name, short code, default shelf life).

### Confirmed defects

1. **Selection state leaks across filters.** `handleSelectAll` replaces the selection with current filtered SKUs, but filtering later does not prune hidden IDs. `checked` is `selectedSkuIds.size === filteredSkus.length`, which can be true/false incorrectly when hidden selections remain (`ProductsView.tsx:53–76, 215–220`). Bulk Edit uses all selected IDs, including possibly hidden records. Show “N selected (M not visible)” and either scope actions to visible/currently selected or explicitly disclose all selected.
2. **Select-all semantics are unclear.** It should select all currently filtered results, not silently erase selections on deselect when selection spans filters. Add indeterminate state and explicit “Select visible” / “Clear selection”.
3. **Inline MRP save clears invalid value.** `NaN`/zero/negative maps to `undefined` (`ProductsView.tsx:83–90`) and then closes the editor. This can erase an MRP accidentally. Invalid input should remain visible and block save; explicit Clear MRP is a different permission-gated action.
4. **Mutation is not awaited.** `onUpdateSku` is async from App, but ProductsView closes editor immediately and does not show progress or failure. A rejected write looks like success.
5. **Bulk update closes immediately and lacks per-SKU summary.** It validates only `>0`, not finite upper bound, currency precision, permission, or whether the selected set is stale. Show affected SKU names/count and require deliberate confirm.
6. **No import workflow despite “CSV import/export” component comment and imported Upload icon.** Add a real import page/dialog or remove misleading language.
7. **CSV export is unsafe.** It wraps text in quotes but does not escape embedded double quotes and may mishandle commas/newlines. It lacks UTF-8 BOM for some spreadsheet workflows, locale/decimal policy, metadata/schema version and clear date/time. Use a tested CSV encoder.
8. **Product code uniqueness is not checked.** `shortCode`/`batchPrefix` are accepted as arbitrary strings. Enforce normalization, allowed characters/length, unique constraints and clear validation errors.
9. **Product creation is incomplete.** It hardcodes brand `brand_adalaj`, allowed pack sizes `100 g`, `200 g`, `500 g`, `1 kg`, and no initial SKU MRP. This is too restrictive for a universal product catalogue and can create SKUs the user did not explicitly select (`ProductsView.tsx:101–119`).
10. **Product + SKUs are written in two DB operations.** App writes product, then SKUs separately (`App.tsx:408–423`). Failure between writes leaves orphan/incomplete product. Use a Dexie transaction or API transaction and commit UI state only after success.
11. **SKU pack parsing is simplistic.** New SKU grams uses `parseFloat(sz)` and only checks whether it includes `kg`; normalize unit, decimals and spelling with a dedicated quantity parser.
12. **No edit/disable/archive product actions exist in the rendered page.** `Trash2`, `Copy`, and related icons are imported but not used. There is no pack-size/weight editor, `enabled` toggle, per-SKU shelf-life override editor, SKU duplicate/merge handling, or product archive workflow.
13. **No MRP provenance/effective dates.** MRP changes must show who changed it, when it becomes effective, who approved it and what old jobs keep frozen. Add MRP history.
14. **No page navigation/pagination.** Large SKU catalogue becomes one huge table. Add pagination or virtualized table, sortable columns, visible count and filters by missing MRP/enabled/archived/pack type.
15. **Table semantics and compact controls need attention.** Checkboxes lack labels; inline edit clickable `<div>` is not keyboard accessible; save/cancel icon buttons lack accessible text; rows do not provide obvious focus/hover states for keyboard users.

### Recommended page structure

**Toolbar**: Products tab / SKUs tab, count, search, filters (brand, status, pack, MRP status), Import, Export, Add Product. Use sticky toolbar for long tables.

**Products list**: Product name, short code, brand, permitted pack sizes, SKU count, shelf-life, status, last updated, actions (Open, Edit, Duplicate, Archive). Product creation wizard should ask for relevant data and create SKUs only for explicitly selected pack formats.

**SKU list**: Product, pack type, pack size, net grams, MRP with source/status/effective date, calculated price per gram, shelf-life override, active state, template resolution, updated time. Row open shows SKU details and MRP history.

**Bulk editor**: selection review, exact affected count, choose action (set MRP, adjust MRP by percentage, enable/disable, archive), preview before/after, required reason, confirm, transactional result.

**CSV import**: upload → detect encoding/header → column mapping → preview parsed rows → row-level errors/warnings → choose merge/update/create policy → backup → confirm → result report and audit event. Never partially import silently.

### Product/SKU business rules

- Product ID and SKU ID use stable opaque UUID/ULID IDs; short codes are human identifiers and uniquely constrained.
- Normalize pack sizes to integer grams (e.g. `0.1 kg` and `100 g` resolve to the same canonical quantity) while preserving display label.
- A pack SKU is active only if product is active, size is allowed, positive grams and unit are consistent.
- MRP values are decimal currency with explicit currency and rounding policy; zero/negative/non-finite are rejected.
- A batch allocation snapshots the authorized MRP and rate at the time the batch is created; an old PrintJob always uses its own value snapshot.
- `shelfLifeOverrideMonths` takes precedence over product default. Define whether expiry means same calendar date minus one day or a regulated alternative; test month-end/leap-year cases.
- Archive is soft-delete and blocked when active open batches or scheduled jobs require the SKU, unless a supervisor explicitly overrides with a reason.

### Acceptance criteria

- [ ] Filter changes cannot cause hidden SKUs to receive unintended bulk updates.
- [ ] Invalid MRP stays in edit state and is never silently converted to an empty value.
- [ ] Create product and generated SKUs are atomic.
- [ ] Duplicate short code and SKU normalized pack-size conflicts are blocked with actionable errors.
- [ ] CSV round-trip preserves commas, quotes, Unicode, line breaks, decimals and empty values.
- [ ] Import supports dry run, errors per row, duplicate policy and rollback.
- [ ] Every successful/failed mutation has visible feedback and audit metadata.
- [ ] Keyboard-only users can select rows, edit values, and operate all bulk actions.
