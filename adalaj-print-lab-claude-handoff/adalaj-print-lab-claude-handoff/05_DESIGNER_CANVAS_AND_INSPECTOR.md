# 05 — Designer: Canvas, Layers, Inspector, Templates & Editor UX

**Primary source:** `src/components/designer/DesignerView.tsx` (roughly 2,854 lines), `src/services/layoutRegistry.ts`, `src/services/fitEngine.ts`, `src/services/passPlanner.ts`, `src/services/printTransform.ts`.

## Current editor areas and actions

- Context toolbar: Product selector, SKU/preview selector, template/scope controls, save, undo/redo, zoom, travel/layout orientation, band/length, fit actions.
- Tool rail: select, text/field, line, rectangle, barcode, QR and related design objects.
- Main canvas: print-band/travel view, rulers/guides, objects selectable/draggable, background pan.
- Right properties/orientation panel: raster transform controls and selected object inspector; object text/font/size/position/alignment/style/rotation/flip/invert/lock controls; template global settings when no object is selected.
- Preview and diagnostics surfaces: live field values, machine view/raster, pass plan and quality findings.
- Save scopes: pack-level default and product/SKU override, with revert/confirmation logic.

## Confirmed logic and interaction defects

1. **Single massive component.** Designer's 2,854-line component owns canvas, selection, undo/redo, template resolution, property controls, raster preview, save scopes, toolbar, dialogs and keyboard logic. It is difficult to test and changes create regressions. Split into cohesive components/hooks/services while retaining a single editor state model.
2. **Template synchronization effect is incomplete.** The resolver effect depends on product, pack size and templates but not all relevant props/profile changes (e.g. initial template and packProfiles dependency in the shown effect at `DesignerView.tsx:171–183`). A machine/pack-profile/template context change can leave stale local state. Define `EditorDocumentKey` and explicitly rehydrate when context key changes; protect dirty draft with Save/Discard/Stay prompt.
3. **Displayed layout info can diverge from the editable template.** `currentLayoutInfo` resolves from `previewSku`, but the editable `template` is local state and context switching has its own effect. Ensure one selected SKU is the canonical source and no stale resolved template is displayed.
4. **Target-only Fit is not target-only.** `handleFitSelected()` calls `fitObjectsToBand(template, machine, packProfile, targetId)` (`DesignerView.tsx:751–758`). The engine later calls `reflowStackedLines()` across every object. Fix selected-only engine semantics; never move other objects without explicit “Fit All”.
5. **Drag permits off-canvas positions.** `handleStartDrag()` computes arbitrary x/y and sets state without clamping (`DesignerView.tsx:1048–1091`). Show out-of-bounds in the inspector/validation and allow intentional off-canvas only in an advanced clipping mode; clamp by default.
6. **Mouse-only dragging and panning.** Uses `onMouseDown`/window `mousemove`/`mouseup` (`DesignerView.tsx:1022–1091`, canvas markup around 1700+). Use Pointer Events, pointer capture, touch/stylus support, correct cancel handling and no lost drag when pointer exits viewport.
7. **No resize handles / bounding box transformation UI.** Inspector fields may allow size input, but a human visual editor needs handles for move/resize/rotate, with physical mm readout. Keep inspector numeric input as precise alternative.
8. **Keyboard input focus handling is incomplete.** Object nudge checks INPUT/SELECT/TEXTAREA but should also respect contenteditable, dialogs, command palette, text controls and modifier keys (`DesignerView.tsx:1093–1121`). Ctrl+S is handled separately without checking text editing (`1123–1133`). Centralize shortcuts; do not hijack user typing.
9. **Undo coalescing can lose/overgeneralize changes.** Undo session tracks select fields and uses JSON cloning; coalescing comparison covers only x/y/width/height/font size/content, not every editable property (`DesignerView.tsx:189–255`). Drag creates snapshots separately. Implement a command/patch history with begin/update/commit/cancel and object-aware snapshots; cover every field, paste/delete/add, multi-select, transform and context switch.
10. **Undo history is memory-only.** A tab refresh loses unsaved draft changes. Add local draft autosave/recovery and unsaved-change indicator; distinguish persisted template from active draft.
11. **No explicit dirty indicator.** Save actions can appear available even with no changes; user may not know if state is saved. Track base version, current revision and last persisted revision. Show Saved / Unsaved / Saving / Save failed.
12. **Save scope risks.** Primary save selects a scope automatically; pack default affects every product using a pack size, SKU override affects only one product+pack size. Make scope visible before save. Show impact count and preview diff. Never silently promote a local temporary template.
13. **Template versioning is weak.** Template `version` exists but normal saves can write same record and version; no robust immutable release history or compare versions. Implement draft revisions, approved/released snapshot and rollback.
14. **Barcode and QR creation inserts demo content.** Defaults use `ADTP014` and a fabricated `https://adalaj.in/b/ADTP014` (`DesignerView.tsx:675–739`). Must bind dynamic values or ask for real static payload; no unowned domain assumptions.
15. **Barcode/QR canvas placeholder is not real code.** See `printTransform.ts:525–535`; all QR content renders as bars. Block production release until standards-based encoding and scan tests exist.
16. **Image object support is incomplete.** Type allows `imageDataUrl`; the editor has no evident complete image import/asset-management workflow. Render code is synchronous and may skip not-yet-loaded image (`printTransform.ts:519–524`). Add safe upload, SVG sanitization/rasterization, asset metadata, crop/fit mode and asynchronous preload. No remote external URL should be fetched without policy.
17. **Symbol type is declared but not rendered.** `ObjectType` includes `symbol`; `renderSingleObject` has no symbol branch. Add deterministic vector glyph support or hide/remove tool until complete.
18. **Object `invert` is misleading.** Current renderer sets text fill to white but no black background. Define inverse background rectangle/polarity semantics and render consistently.
19. **`channel` is modeled but output ignores it.** Renderer draws monochrome black/white; it does not validate machine supported channels. Either implement actual supported channel separations or explicitly restrict the app to a 1-bit black process and warn when unsupported channels are selected.
20. **Text measurement is not production accurate.** Fit engine approximates width by character count × font size; renderer auto-compresses text to object width. Must measure actual resolved string with the exact embedded font and per-axis scale. Do not shrink unexpectedly at render time without a visible warning.
21. **Text wrapping/line height behavior needs a model.** No true multiline text layout engine is evident. Define `white-space`, wrapping, overflow, font embedding/fallback and text baseline consistently between canvas preview and output.
22. **Dynamic placeholders can remain unresolved.** Renderer preserves `{token}` when a value is absent. Preflight must identify unresolved token, empty value and overlong value and block release when required.
23. **Canvas dimensions and coordinate axes are easy to confuse.** Expose width/height in mm and locked-axis/travel-axis labels with diagram. Use same coordinate transform for editor, print preview and output.
24. **Rotation-aware validation missing.** Object rotation is applied around center in renderer, but fit engine and overlap checks use unrotated x/y/width/height. Compute rotated bounding polygon/axis-aligned extent and clip tests.
25. **Lock types are not fully represented in the UI.** `lockType` supports all/position/size; visible UI should distinguish them and explain why one edit is disabled.
26. **Delete and destructive operations lack context.** Confirm delete for non-recoverable multi-object removal; make undo immediate; support duplicate/paste/clone, layer order and group selection.
27. **No multi-select, align/distribute, grouping, snap guides, or object list.** A production editor needs these for consistent templates. Add object/layer panel with reorder, hide/show, lock, name, duplicate, grouping and multi-select.
28. **Tool rail placement can overwhelm novice operator.** Put standard fields/text/shapes behind a clear add menu; keep advanced engineering tools in Advanced mode.
29. **Ruler and zoom physical scale need truthful labeling.** Browser pixel scale is not physical mm unless per-display calibration is applied. Calibration currently is not connected to canvas (see Settings doc). Label 100% as `document scale at calibrated display` only when supported; export dimensions are independent.
30. **Print pass plan is advisory but may be mistaken for instructions.** Hardcoded pass counts/offsets mean do not call it machine-ready until planner is fixed and output contains files exactly matching every planned pass.

## Recommended editor layout

### Global editor chrome
- Breadcrumb/context bar: Product / SKU / template / template version / machine / pack profile.
- Status bar: Draft/Released, unsaved state, physical document size, zoom, selected object count, warning/error count.
- Top toolbar: Undo, Redo, Save Draft, Submit for Review, Fit Selection, Fit All, Preview, Validate; keep scope selection adjacent to Save.

### Left tool + layers rail
- Add Text, Add Variable Field, Shape, Image, Barcode, QR, Symbol (only if implemented).
- Searchable field library with allowed fields by current product/SKU/batch.
- Layers list with visibility, lock, drag reorder, selection, rename, duplicate, delete.
- Field data source panel explaining token and fallback behavior.

### Center canvas
- Physical frame with mm rulers and locked-axis dimension label.
- Print band outline, pack print-window outline, content safe area, edge buffer, clipping overlay, baseline guides and optional grid.
- Pointer-based object selection and transform handles.
- Snap-to-grid/guides/edges; configurable snap increment (0.1/0.5/1 mm).
- Zoom, pan, Fit, 1:1 calibrated preview; pan should not be confused with moving a selected object.
- Responsive inspector: on narrow screens, inspector is a drawer/sheet, not crushed beside the canvas.

### Right inspector
Use sections with explicit headings and predictable ordering:
1. **Identity/data** — layer name, type, linked field, data preview, static vs dynamic, required.
2. **Position** — X, Y, width, height in mm; lock constraints; align/center to band; reset.
3. **Typography** — font (embedded/approved), font size in mm and pt equivalent, weight/style, alignment, line height, letter spacing, max width, wrap/overflow behavior.
4. **Geometry** — fill/stroke, line weight in mm, corner radius, shape-specific properties.
5. **Orientation** — angle, Flip X/Y, transform origin; explicitly distinguish object vs whole-raster transform.
6. **Print behavior** — black/white, inversion background, channel only if supported, barcode symbology/quiet zone.
7. **Quality** — live object errors and suggested fix; do not auto-change without preview/undo.

### Save and version workflow
- Save Draft never changes existing released version.
- Save as Pack Default explicitly reports which SKUs inherit it.
- Save as SKU Override explicitly reports affected SKU.
- Submit for Review records author and version.
- Release requires zero blocking errors and approval permission.
- Revert creates a new draft copied from a previous version; never delete evidence of a released template.

## Technical decomposition recommended

Break `DesignerView` into:

- `DesignerWorkspace` orchestration (current context + save lifecycle)
- `DesignerToolbar`
- `ToolPalette`
- `LayersPanel`
- `CanvasViewport`
- `DesignCanvas`
- `RulerOverlay`, `GuidesOverlay`, `SelectionOverlay`, `TransformHandles`
- `ObjectInspector` and type-specific inspectors (`TextInspector`, `BarcodeInspector`, `ImageInspector`, `ShapeInspector`, `FieldInspector`)
- `TemplateScopeDialog`, `SaveTemplateDialog`, `UnsavedChangesDialog`, `ValidationDrawer`
- hooks: `useEditorDocument`, `useEditorHistory`, `usePointerDrag`, `useKeyboardShortcuts`, `useTemplateResolution`
- pure services: geometry, text layout/measurement, field binding, code encoding, preflight and template version operations.

## Acceptance criteria

- [ ] Changing product/SKU/machine/profile cannot leave a stale template or stale inspector selection.
- [ ] Selected-only Fit modifies only selected target; Fit All is separate and undoable.
- [ ] Pointer drag works with mouse/touch/stylus and is keyboard-equivalent.
- [ ] Objects cannot be accidentally lost off-canvas without explicit warning/intent.
- [ ] Undo/redo covers every object/template edit and redo is invalidated correctly after a new edit.
- [ ] Every code/QR scans after raster export at the intended DPI and minimum size.
- [ ] Every image is decoded before export; no missing asset can silently disappear.
- [ ] No unsupported symbol/channel/invert setting gives false visual output.
- [ ] Preflight checks real data values, rotated boxes, text width and pack print window.
- [ ] Save scope is explicit, versioned and impact-aware.
- [ ] Screen zoom/calibration never alters physical output pixel dimensions.
