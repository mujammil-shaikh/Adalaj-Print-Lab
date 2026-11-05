# 12 — Visual UX, Interaction Design, Accessibility, and Responsive Behavior

## Design objective
The ideal operator experience is calm, unambiguous and production-safe. Users should not need to understand React, millimetres, USB endpoints or barcode internals to complete a normal job. Advanced engineering tools remain available in Designer/Settings, but routine work stays guided.

## Cross-application visual problems to correct

- Some clickable `div`/container elements behave like buttons but are not keyboard-operable or announced correctly by assistive technology.
- Icon-only controls lack consistent accessible names/tooltips.
- Status is sometimes represented by a static green badge rather than live validated state.
- There is no consistent loading/error/empty/saving/saved/stale state pattern across pages.
- Large view components carry multiple workflows and many controls, making hierarchy and testing difficult.
- Dense panels and fixed layouts need explicit responsive behavior for common desktop, laptop and tablet widths.
- A green/red colour alone is insufficient for print, sync, status and validation.

## Global design system requirements

### Tokens
Define semantic tokens for surface/background, raised surface, border, text primary/secondary, accent, success, warning, danger, info, focus, disabled, overlay, spacing, radii, elevation, typography, density and motion. Ensure light/dark themes both meet contrast requirements. Avoid ad hoc hard-coded colours inside pages.

### Typography and information hierarchy
- Use one readable UI type scale and a tabular numeric style for MRP, quantities, counts, dates and dimensions.
- Keep page title, page description, primary action and current workflow state visually distinct.
- Use Indian number/currency formatting consistently (₹, digit grouping) and make units explicit (g, kg, mm, DPI, labels).
- Do not truncate critical IDs, lot numbers, MRP or error text without a way to reveal/copy the full value.

### Buttons
Each button has one intent and a consistent hierarchy: primary, secondary, tertiary/ghost, destructive. Specify hover, focus-visible, pressed, disabled, loading and success states. Disable only with a visible reason. Prevent double submission. Destructive actions use a confirmation dialog describing the exact target and consequence.

### Forms
Use labels above controls, examples, unit hints, helper text, inline errors and validation summaries. Preserve user input after failed save. Validate on blur and submit without flashing errors on first render. Numeric values reject NaN, Infinity, negative or impossible ranges; date fields use calendar semantics. Do not rely on placeholders as labels.

### Dialogs, drawers and side panels
- Accessible name and description; focus moves inside on open and returns to trigger on close.
- Escape closes non-destructive dialogs; unsaved changes trigger a discard confirmation.
- Focus trap and sensible tab sequence.
- On small screens, drawers become full-height panels; no horizontal overflow.
- Save/cancel footer remains reachable and keyboard-accessible.
- Nested dialogs should be avoided.

### Tables and lists
- Row actions are explicit buttons.
- Sorting announces direction; filter and selection counts are visible.
- Select-all acts only on the current result scope and says so.
- Bulk actions report how many visible/selected records will change.
- Provide empty states with relevant next action, not blank white space.
- Pagination preserves filters and selected IDs safely.

### Feedback and state
Every async interaction has pending, success, failure and retry/rollback behavior. Toasts complement, not replace, persistent inline errors. A save state is `Unsaved`, `Saving`, `Saved at time`, or `Save failed`; avoid ambiguous spinners. Show stale preview and last-render timestamp.

## Page-specific UX targets

- **Home:** one clear “Create batch”/“Continue job” action, accurate inventory summaries, real alert counts, no placeholder-ready badge; show why a batch is print-ready or blocked.
- **Products:** search/filter, dense but readable SKU table, safe bulk selection, inline edit accessible by keyboard, explicit MRP validation and CSV import/export validation.
- **Batches:** guided stages with back/next, live mass balance, allocation details, SKU-specific MRP, date calculation preview, duplicate-ID errors, and no hidden forced quantities.
- **Designer:** canvas + layer tree + context-sensitive inspector, clear selection state, zoom/fit controls, snapping/grid toggle, undo/redo, autosave/dirty state, keyboard shortcuts, responsive inspector drawer.
- **Print:** preflight, accurate transport state, large exact preview, progress/attempt timeline, quantity reconciliation and physical verification.
- **History:** real filters, immutable snapshot view, exact vs current-data reprint distinction.
- **Settings:** tabs with save state, versioned machine/pack profiles, explicit units, test/calibration steps, backup restore preview.
- **AI:** proposals never silently mutate data; before/after and affected record list; assistant is labeled honestly.

## Accessibility baseline
Target WCAG 2.2 AA where applicable:
- Semantic headings, landmarks, buttons, links, labels and table headers.
- Keyboard-only completion of every workflow.
- Visible focus indicator; logical focus order; no keyboard traps.
- Colour contrast for text, controls, borders, focus and disabled states.
- Form errors programmatically associated with fields.
- Dialogs and popovers expose correct roles/names and restore focus.
- Dynamic status/progress uses `aria-live` appropriately and does not flood announcements.
- Canvas editor exposes a keyboard-accessible object list and inspector controls; canvas is not the only way to select/edit objects.
- Touch targets comfortably usable; do not encode critical operation solely on hover.
- Respect reduced-motion preference.

## Responsive breakpoints and behavior
Test widths 360, 390, 768, 1024, 1280, 1440 and ultrawide. Primary production use may be desktop, but batch entry/monitoring must remain usable on tablet. On narrow layouts: left nav collapses, tables horizontally scroll with sticky key columns or turn into labeled cards, right inspector becomes a drawer, action toolbars wrap, and dialogs become edge-to-edge. Ensure the canvas retains correct physical aspect ratio within a scroll/zoom viewport.

## Human-centred design validation
Observe at least three representative users performing: find SKU, create production batch, allocate packs, prepare and print labels, verify output, exact reprint, fix a template and restore a backup. Measure completion time, errors, help requests and recovery success. Test with gloves/production-floor lighting if relevant. Do not claim usability is “best” without observed testing.
