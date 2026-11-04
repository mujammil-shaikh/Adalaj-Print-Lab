# 17 — Defect Traceability Matrix

This matrix is the control sheet for the audit. Status is **identified / not fixed by this audit**. Claude Code must update status only after a code change and a test prove the correction. Severity: P0 = production correctness/safety blocker; P1 = major workflow or reliability defect; P2 = usability/maintainability improvement.

| ID | Area | Finding | Severity | Primary source | Required proof |
|---|---|---|---|---|---|
| DATA-01 | Product/SKU | Product and SKU writes can be split across operations; partial state possible | P0 | `src/App.tsx`, `src/services/db.ts` | Transaction rollback test |
| DATA-02 | Product/SKU | SKU code generation lacks robust uniqueness enforcement | P0 | `src/App.tsx`, `src/services/db.ts` | Duplicate/concurrent code test |
| DATA-03 | Initialization | Seed logic can skip healing incomplete tables | P1 | `src/services/db.ts` | Partial DB recovery test |
| DATA-04 | Initialization | Stale SKU array set after verified SKU update | P1 | `src/App.tsx` | Persist/reload/state consistency test |
| DATA-05 | Batch | Batch ID generation/manual override lacks duplicate protection | P0 | `src/components/batches/BatchesView.tsx` | Duplicate batch creation test |
| DATA-06 | Batch | Allocation IDs/foreign references may be reused on duplicate | P0 | `src/components/history/HistoryView.tsx`, `src/types/index.ts` | Duplicate batch referential-integrity test |
| DATA-07 | Inventory | Mass-balance/allocation calculations duplicated and hidden by coercion | P0 | Batches/Home/App | Domain property tests |
| DATA-08 | Inventory | `Math.max`/minimum-one fallbacks can force allocations/pack count | P0 | `BatchesView.tsx` | Invalid/zero allocation test |
| DATA-09 | Dates | UTC string/local date handling can shift business calendar date | P1 | Batches/Home | Timezone matrix test |
| DATA-10 | Dates | Month-end `setMonth` expiry behavior can overflow | P1 | `BatchesView.tsx` | Jan-31/Feb-29/leap-year test |
| DATA-11 | Home | Loose-stock summary includes inappropriate batch states and clamps negatives | P1 | `HomeView.tsx` | Stock ledger reconciliation test |
| DATA-12 | Products | Bulk selection can retain hidden IDs and edit filtered-out rows | P1 | `ProductsView.tsx` | Filter + select-all + bulk edit test |
| DATA-13 | Products | CSV export does not fully escape quotes; import absent/incomplete | P2 | `ProductsView.tsx` | CSV round-trip/escaping test |
| DATA-14 | Products | Invalid MRP can be converted to undefined and editor closes | P1 | `ProductsView.tsx`, `App.tsx` | Invalid form retains input and error |
| PR-01 | Transport | Network raw print uses browser `no-cors` fetch; cannot verify response | P0 | `src/services/hardwareAdapters.ts` | Adapter contract test; agent integration |
| PR-02 | Transport | Network error path may return success | P0 | `hardwareAdapters.ts` | Error/timeout cannot return success |
| PR-03 | Transport | Dispatch wrapper can report success regardless of underlying result | P0 | `hardwareAdapters.ts` | End-to-end simulated failure |
| PR-04 | Print status | Mark printed can mark expected count without device evidence | P0 | `PrintView.tsx`, `App.tsx` | Count/state distinction tests |
| PR-05 | Print | Browser USB assumes device configuration/interface/endpoint | P1 | `hardwareAdapters.ts` | Hardware profile tests |
| PR-06 | Print | BLE accepts all devices and selects first writable characteristic | P1 | `hardwareAdapters.ts` | Unsupported device and protocol tests |
| PR-07 | Print | USB-drive branch does not write to drive but suggests ready | P1 | `hardwareAdapters.ts`, `PrintView.tsx` | UI truth test |
| PR-08 | Print | Wrong allocation may use first allocation template | P0 | `src/App.tsx`, `PrintView.tsx` | Select allocation #2 E2E |
| PR-09 | Print | Print preview inserts fallback MRP and dates | P0 | `PrintView.tsx` | Missing business values block print |
| PR-10 | Print | Render errors are console-only; stale preview can remain | P1 | `PrintView.tsx` | Render failure state test |
| PR-11 | Export | Pass planner may report multiple passes while ZIP emits one file set | P1 | `PrintView.tsx`, `passPlanner.ts` | Multi-pass file-count test |
| PR-12 | Export | Hardcoded “Pass 1 of 1” conflicts with manifest | P1 | `PrintView.tsx` | Manifest consistency test |
| RENDER-01 | Raster | BMP header hardcodes 300 DPI | P1 | `printTransform.ts` | DPI header test |
| RENDER-02 | Raster | X/Y DPI averaged in physical conversion | P1 | `printTransform.ts` | Non-square DPI geometry test |
| RENDER-03 | Raster | Download/printer orientation transform diverges | P1 | `printTransform.ts`, `DesignerView.tsx` | Golden orientation test |
| RENDER-04 | Assets | Async image may be omitted on initial render | P1 | `printTransform.ts` | Cold-cache image render test |
| RENDER-05 | Symbols | Symbol object branch not properly rendered | P1 | `printTransform.ts` | Symbol fixture test or block type |
| RENDER-06 | Symbols | Invert does not draw background region | P2 | `printTransform.ts` | Black/white pixel test |
| RENDER-07 | Barcode/QR | Decorative bars used instead of actual encoded symbology | P0 | `printTransform.ts` | Barcode/QR decode tests |
| FIT-01 | Designer | Text fitting uses rough character approximation | P1 | `fitEngine.ts` | Real font metric tests |
| FIT-02 | Designer | Fit selected may reflow all objects | P1 | `fitEngine.ts`, `DesignerView.tsx` | Selected object scope test |
| FIT-03 | Designer | Fixed dimensions/column assumptions in layouts | P1 | `fitEngine.ts` | Profile-driven geometry tests |
| FIT-04 | Designer | Incomplete geometry, rotation and negative-bound validation | P1 | `fitEngine.ts` | Rotated/out-of-bounds tests |
| PASS-01 | Planner | Template/machine travel constraint mismatch | P1 | `passPlanner.ts` | Override constraint test |
| PASS-02 | Planner | Zero objects can produce negative gap/travel intermediate | P1 | `passPlanner.ts` | Empty plan test |
| PASS-03 | Planner | Vertical stack split uses hardcoded half/length behavior | P1 | `passPlanner.ts` | Boundary property tests |
| DESIGN-01 | Designer | Very large monolithic component complicates state and test coverage | P2 | `DesignerView.tsx` | Component/module coverage and regression suite |
| DESIGN-02 | Designer | Canvas mouse handlers lack robust pointer/clamping behavior | P1 | `DesignerView.tsx` | Drag/resize/pointer tests |
| DESIGN-03 | Designer | Global keyboard commands may run while contenteditable focused | P1 | `DesignerView.tsx`, `App.tsx` | Focus-suppression test |
| DESIGN-04 | Designer | Image assets lack robust async load/import lifecycle | P1 | `DesignerView.tsx`, `printTransform.ts` | Import/reload/render test |
| DESIGN-05 | Designer | QR default uses hardcoded example URL | P1 | `DesignerView.tsx` | No invented payload test |
| DESIGN-06 | Designer | Calibration factor saved but not used in editor | P2 | `SettingsView.tsx`, `DesignerView.tsx` | Calibration behavior test or remove setting |
| HIST-01 | History | Print jobs not persisted despite table/claims | P0 | `db.ts`, `PrintView.tsx`, `HistoryView.tsx` | Job write and reload test |
| HIST-02 | History | Exact reprint rebuilds from current live data/template | P0 | `HistoryView.tsx`, `PrintView.tsx` | Byte-identical historical artifact test |
| HIST-03 | History | Hardcoded history status/batch filters | P1 | `HistoryView.tsx` | Dynamic query/filter tests |
| HIST-04 | History | `packsPrinted || expectedPacks` corrupts zero semantics | P0 | `HistoryView.tsx` | Zero-count test |
| HIST-05 | History | No attempt timeline/operator/device evidence | P1 | History/DB/types | Audit completeness test |
| SET-01 | Settings | Machine profile update callback unused / editor absent | P1 | `SettingsView.tsx` | Edit/save/reload test |
| SET-02 | Settings | Pack wizard captures incomplete physical window/calibration | P1 | `SettingsView.tsx`, `types/index.ts` | Calibration fixture test |
| SET-03 | Settings | Hardware settings advertise capabilities not truly implemented | P1 | `SettingsView.tsx`, `hardwareAdapters.ts` | UI adapter capability contract test |
| SET-04 | Settings | Display calibration stored but unused | P2 | `SettingsView.tsx`, `DesignerView.tsx` | Functional proof or remove |
| SET-05 | Settings | Shortcut input is text, not real key capture | P1 | `SettingsView.tsx` | Keyboard capture interaction test |
| SET-06 | Settings | Shortcut dispatcher hardcoded, registry remapping diverges | P1 | `App.tsx`, `actionRegistry.ts` | Rebind dispatch test |
| SET-07 | Backup | Export/import incomplete, no dry-run/transaction/version safety | P0 | `SettingsView.tsx`, `db.ts` | Corrupt/rollback restore tests |
| AI-01 | AI | Google GenAI package/client initialized but current prompt path is rule-based | P2 | `aiCopilot.ts` | Honest labeling or secure real model integration |
| AI-02 | AI | Hardcoded scenarios may produce invalid allocations | P1 | `aiCopilot.ts` | Proposal domain validation tests |
| AI-03 | AI | Apply path writes audit but does not apply every proposal mutation | P0 | `aiCopilot.ts`, `AICopilotDrawer.tsx`, `App.tsx` | Persisted result verification test |
| AI-04 | AI | Auto-approval unsafe for production-changing proposals | P0 | AI service and drawer | No mutation without explicit approval |
| SHELL-01 | Navigation | View-state navigation is not URL/deep-linkable | P2 | `App.tsx` | Refresh/back/deep-link E2E |
| SHELL-02 | Actions | Action registry only covers subset of app actions | P1 | `App.tsx`, `actionRegistry.ts` | Action catalog parity test |
| SHELL-03 | Accessibility | Clickable containers are not semantic buttons | P1 | Header/views | Keyboard/accessibility audit |
| SHELL-04 | PWA | `navigator.onLine` indicator is not real sync state | P2 | `PWAInstallButton.tsx` / shell | Offline/sync state tests |
| SHELL-05 | Tour | Guided tour/help content can drift from actual action behavior | P2 | `GuidedTour.tsx`, `KeyboardOverlays.tsx` | Tour target/command integration tests |

## Required additional inventory

Claude Code must add any discovered defects to this matrix. In particular, inspect every visible element and classify it as one of:

- navigation/action button;
- primary/secondary form action;
- selector/dropdown/popover;
- menu/context menu/command palette item;
- dialog/drawer action;
- canvas tool/inspector action;
- print/download/transport action;
- settings/backup action;
- status-only indicator;
- disabled/placeholder/demo control.

Every active control must have a documented callback/command, permission rule, validation, persistence effect (if any), success feedback, failure feedback, keyboard behavior and automated test. A visible but inactive control must be removed or explicitly disabled with a reason.

## Status columns Claude Code should append

`Status` (identified/in progress/fixed/blocked/not applicable), `Commit`, `Test file + test name`, `Manual verification`, `Residual risk`, `Owner`, `Release`. Never change status to fixed based only on code review.

## Static interaction surface inventory (baseline snapshot)

A source scan of the submitted component files found the following explicit JSX event-handler counts. These are **handler counts, not a verified count of unique user-facing buttons**; several handlers may be attached to non-button containers, and one visual control may have multiple handlers. The scan found **203 `onClick=` handlers** across the listed components and **no literal native `<button>` elements** in the component TSX files. Claude Code must inspect the actual rendered element for each handler and replace non-semantic clickable containers with real buttons/links as appropriate.

| Component | `onClick` handlers | `onChange` handlers | Additional pointer handlers | Main control surfaces to enumerate individually |
|---|---:|---:|---:|---|
| `components/home/HomeView.tsx` | 13 | 1 | 0 | Dashboard cards, batch/product shortcuts, preview selectors, primary workflow actions |
| `components/products/ProductsView.tsx` | 10 | 9 | 0 | Search, product filter, select-all/row selection, inline MRP edit, add product, bulk edit, upload/download affordances |
| `components/batches/BatchesView.tsx` | 11 | 10 | 0 | Wizard navigation, product/SKU choices, allocation rows, add/remove allocation, quantity/date controls, save/create actions |
| `components/designer/DesignerView.tsx` | 81 | 17 | 11 | Tool selection, object insert, canvas selection/drag/resize, zoom, band/length presets, fit, line gap, save menu/scopes, print navigation, inspector controls |
| `components/print/PrintView.tsx` | 36 | 6 | 4 | Batch/allocation selection, render/repair, preflight, export formats, USB/BLE/network controls, start/retry/mark-printed actions |
| `components/history/HistoryView.tsx` | 4 | 1 | 0 | History filters, search, duplicate, exact reprint/navigation |
| `components/settings/SettingsView.tsx` | 19 | 10 | 0 | Settings tabs, machine/pack profiles, hardware, calibration, shortcuts, backup/restore |
| `components/ai/AICopilotDrawer.tsx` | 9 | 3 | 0 | Prompt suggestions/input, run, apply/discard proposals, voice-related controls |
| `components/shell/Header.tsx` | 8 | 0 | 0 | Main nav, active context chips, theme, command palette, AI, tour, help, PWA install |
| `components/shell/ContextualShortcutStrip.tsx` | 1 | 0 | 0 | Contextual command actions |
| `components/shell/KeyboardOverlays.tsx` | 4 | 2 | 0 | Keyboard help/overlay controls |
| `components/shell/GuidedTour.tsx` | 4 | 0 | 0 | Back/next/skip/finish and dismissal |
| `components/shell/PWAInstallButton.tsx` | 3 | 0 | 0 | Install/update/reload states |

The scan does not capture controls implemented through `addEventListener`, keyboard event listeners, canvas handlers, form `onSubmit`, select/input value binding or state changes indirectly triggered from parent callbacks. It is a baseline index for a second-pass rendered-control audit, not a claim that every control is tested. For each listed interaction, Claude Code must record: visible label/icon, DOM role, accessible name, scope/selection precondition, command/function, validation, persistence side effect, pending state, failure path, success feedback, undo/retry semantics, keyboard behavior, responsive behavior and test ID.
