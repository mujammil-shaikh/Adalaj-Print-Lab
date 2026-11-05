# Volume 05 — Designer Canvas & Band Constraints (Scenarios 401 – 500)

**Domain:** 2D Canvas Designer, 12.5 mm TIJ Nozzle Band Restrictions, Dynamic Field Tokens, Auto-Fit Text, Layer Hierarchy, Snap Grids, 1-bit Monochrome Rendering  
**Target:** `https://adalaj-label-studio.vercel.app` & `src/components/designer/`, `src/types/template.ts`

---

## 1. Canvas Dimensions & Machine Band Constraints (SCN-401 – SCN-430)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-401 | Simple | PLN | Open Designer View | Navigation bar | Click "Design" tab or press `4` | Designer view loads with canvas viewport, layer tree, and property inspector. | Verified |
| SCN-402 | Simple | PLN | Default Canvas Aspect Ratio | Designer loaded | Inspect canvas dimensions | Renders default label dimensions (e.g. 50 mm width × 25 mm height). | Verified |
| SCN-403 | Medium | PLN | Change Label Width | Property panel | Enter width `75` mm | Canvas expands horizontally; coordinates scale accurately. | Verified |
| SCN-404 | Medium | PLN | Change Label Height | Property panel | Enter height `35` mm | Canvas expands vertically; grid lines update dynamically. | Verified |
| SCN-405 | Complex | MNT | TIJ 12.5 mm Physical Printhead Band Guide | Machine set to TIJ (12.5mm cartridge) | Toggle "Show Head Bounds" | Displays horizontal cyan boundary line at exactly $12.5\text{ mm}$ height. | Verified |
| SCN-406 | Complex | PLN | Element Overflow Alert for 12.5 mm Band | Text element positioned at Y=14mm on TIJ machine | Drag element | Visual warning badge: "Element exceeds 12.5mm single-cartridge nozzle band limit". | Verified |
| SCN-407 | Complex | MNT | Dual-Head Stitching Mode (25.0 mm Band) | Machine set to Dual-Head TIJ | Inspect band guides | Displays two stitched 12.5mm bands totaling 25.0mm with 0.5mm overlap guide. | Verified |
| SCN-408 | Simple | PLN | Zoom Canvas In | Toolbar visible | Click "+" button or scroll `Ctrl+Wheel` up | Canvas zooms in smoothly (125%, 150%, 200%, 300%). | Verified |
| SCN-409 | Simple | PLN | Zoom Canvas Out | Toolbar visible | Click "-" button or scroll `Ctrl+Wheel` down | Canvas zooms out (75%, 50%, 25%) maintaining viewport center. | Verified |
| SCN-410 | Simple | PLN | Zoom Reset to 100% | Canvas zoomed | Click "100%" or press `Ctrl+0` | Canvas resets to 1:1 pixel scale. | Verified |
| SCN-411 | Simple | PLN | Fit Canvas to Screen | Any zoom level | Click "Fit to Screen" | Scales canvas to occupy maximum viewport area while preserving margins. | Verified |
| SCN-412 | Medium | PLN | Pan Canvas Viewport | Canvas zoomed > 100% | Hold `Space` + drag mouse | Pans canvas viewport smoothly in any direction. | Verified |
| SCN-413 | Simple | PLN | Toggle Background Grid | Toolbar | Click "Grid" icon | Toggles 1 mm / 5 mm millimeter grid lines on/off. | Verified |
| SCN-414 | Medium | PLN | Toggle Magnetic Snap to Grid | Toolbar | Click "Snap to Grid" | Elements snap to nearest millimeter increment during drag and resize. | Verified |
| SCN-415 | Medium | PLN | Snap to Center Guides | Drag element to canvas center | Move element | Magenta guide lines appear at exact vertical and horizontal centers. | Verified |
| SCN-416 | Medium | PLN | Snap to Sibling Element Edges | Two elements on canvas | Drag Element A near left edge of Element B | Cyan alignment guide snaps Element A flush with Element B. | Verified |
| SCN-417 | Simple | PLN | Canvas Margin / Safe Zone Visualizer | Properties panel | Set margin to 2 mm | Dashed green rectangle marks 2mm non-printable edge margin. | Verified |
| SCN-418 | Complex | PLN | Prevent Elements in Safe Zone | Drag element into margin | Observe preflight indicator | Flags warning: "Element crosses 2mm edge margin safe zone; risk of clipping on conveyor drift." | Verified |
| SCN-419 | Simple | PLN | Rotate Canvas Orientation | Properties panel | Select orientation "90° Clockwise" | Rotates canvas coordinate system 90° for vertical conveyor indexing. | Verified |
| SCN-420 | Simple | PLN | Rotate Canvas 180° | Properties panel | Select "180° Inverted" | Flips layout upside down for reverse web feed paths. | Verified |
| SCN-421 | Simple | PLN | Rotate Canvas 270° | Properties panel | Select "270° Counter-Clockwise" | Rotates 270° for bottom-up continuous feed. | Verified |
| SCN-422 | Medium | PLN | DPI Resolution Switcher | Toolbar | Select 300 DPI vs 203 DPI vs 600 DPI | Recalculates canvas pixel buffer to match machine thermal/CIJ resolution. | Verified |
| SCN-423 | Complex | MNT | 1-bit Monochrome Preview Mode | Toolbar | Click "1-Bit Preview" | Renders true black/white thresholded raster to simulate thermal ink output without grayscales. | Verified |
| SCN-424 | Simple | PLN | Canvas Background Color Indicator | Properties | Toggle "Show White Label Backing" | Displays clean white label canvas against dark slate workspace background. | Verified |
| SCN-425 | Medium | PLN | Custom Label Shape: Rounded Corners | Properties | Enter corner radius `2` mm | Canvas renders realistic rounded die-cut label outline. | Verified |
| SCN-426 | Medium | PLN | Measurement Units Toggle (mm vs inch) | Properties | Switch unit from `mm` to `in` | Converts coordinates to fractional/decimal inches ($50.8\text{ mm} = 2.0\text{ in}$). | Verified |
| SCN-427 | Simple | PLN | Element Coordinates Display | Element selected | Observe Inspector header | Displays real-time `X: 12.5 mm`, `Y: 4.2 mm`, `W: 24.0 mm`, `H: 6.0 mm`. | Verified |
| SCN-428 | Medium | PLN | Keyboard Nudge (1 mm) | Element selected | Press Arrow keys (`Up`, `Down`, `Left`, `Right`) | Moves element exactly 1.0 mm in pressed direction. | Verified |
| SCN-429 | Medium | PLN | Fine Keyboard Nudge (0.1 mm) | Element selected | Hold `Shift` + Arrow keys | Moves element exactly 0.1 mm for precision micro-alignment. | Verified |
| SCN-430 | Complex | PLN | Canvas Undo / Redo History | Perform 5 layout edits | Press `Ctrl+Z` 5 times, then `Ctrl+Y` 5 times | Flawlessly reverts and restores layout state across all 5 steps. | Verified |

---

## 2. Dynamic Field Tokens & Text Formatting (SCN-431 – SCN-465)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-431 | Simple | PLN | Add Static Text Element | Toolbar | Click "Add Text" | Inserts new text box with default text "Sample Text" at center. | Verified |
| SCN-432 | Simple | PLN | Edit Text Content Inline | Double-click text box | Type "BEST BEFORE" | Updates text value immediately on canvas. | Verified |
| SCN-433 | Simple | PLN | Change Font Family | Text selected | Select font "Inter" / "Roboto Mono" / "Courier" | Text updates font rendering instantly. | Verified |
| SCN-434 | Simple | PLN | Change Font Size | Text selected | Change size from 12pt to 18pt | Text bounding box and font glyphs scale cleanly. | Verified |
| SCN-435 | Simple | PLN | Toggle Font Weight (Bold) | Text selected | Click "B" icon or press `Ctrl+B` | Toggles font weight between Normal and Bold (700). | Verified |
| SCN-436 | Simple | PLN | Text Alignment Left / Center / Right | Text selected | Click alignment icons | Changes text horizontal alignment within its bounding box. | Verified |
| SCN-437 | Medium | PLN | Bind Dynamic Token: BATCH_NUMBER | Text element selected | Click "+ Insert Token", select `{BATCH_NUMBER}` | Text binds `{BATCH_NUMBER}`; resolves to sample "ADTP-2026-001". | Verified |
| SCN-438 | Medium | PLN | Bind Dynamic Token: MFD | Text element selected | Insert token `{MFD}` | Resolves to sample MFD date string "15/01/2026". | Verified |
| SCN-439 | Medium | PLN | Bind Dynamic Token: BEST_BEFORE | Text element selected | Insert token `{BEST_BEFORE}` | Resolves to clamped anniversary Best Before date "14/07/2026". | Verified |
| SCN-440 | Medium | PLN | Bind Dynamic Token: MRP | Text element selected | Insert token `{MRP}` | Resolves to formatted MRP currency "₹65.00". | Verified |
| SCN-441 | Medium | PLN | Bind Dynamic Token: RATE_PER_G | Text element selected | Insert token `{RATE_PER_G}` | Resolves to "₹0.65 / g". | Verified |
| SCN-442 | Medium | PLN | Bind Dynamic Token: NET_WEIGHT | Text element selected | Insert token `{NET_WEIGHT}` | Resolves to "100 g". | Verified |
| SCN-443 | Medium | PLN | Bind Dynamic Token: PRODUCT_NAME | Text element selected | Insert token `{PRODUCT_NAME}` | Resolves to "Turmeric Powder". | Verified |
| SCN-444 | Complex | PLN | Combined Prefix & Token: "Batch: {BATCH_NUMBER}" | Edit text box | Enter `Batch No: {BATCH_NUMBER}` | Resolves cleanly to `Batch No: ADTP-2026-001`. | Verified |
| SCN-445 | Complex | PLN | Multi-Token Text Block | Edit text box | Enter `B: {BATCH_NUMBER} | MFD: {MFD} | EXP: {BEST_BEFORE}` | Resolves all 3 tokens into single multi-column header line. | Verified |
| SCN-446 | Complex | PLN | Auto-Fit Text Bounding Box | Fixed width 30mm, long text | Enable "Auto-Fit Text" | Dynamically reduces font size so text never clips or overflows the 30mm boundary. | Verified |
| SCN-447 | Medium | PLN | Text Multi-Line Wrapping | Long text entered | Enable "Wrap Text" | Wraps text onto subsequent lines within bounding box height. | Verified |
| SCN-448 | Simple | PLN | Change Text Color (Monochrome Safe) | Text selected | Toggle Black (#000000) vs Inverted White (#FFFFFF) | Renders high-contrast monochrome text. | Verified |
| SCN-449 | Medium | PLN | Inverted White Text on Black Pill | Black rectangle element | Place white text inside black rectangle | Renders clean white-on-black inverted highlight block for regulatory notices. | Verified |
| SCN-450 | Complex | QAC | Commercial Truth: Reject Hardcoded Fallback MRP | Text contains static "₹50" | Preflight inspects element | Warning: "Static MRP detected. Use dynamic token {MRP} linked to authorized SKU catalog." | Verified |
| SCN-451 | Complex | QAC | Commercial Truth: Reject Hardcoded Expiry Date | Text contains static "10/10/26" | Preflight inspects element | Warning: "Static date detected. Use dynamic token {BEST_BEFORE} to ensure valid anniversary calculation." | Verified |
| SCN-452 | Simple | PLN | Line Spacing / Leading Adjustment | Multi-line text | Adjust line height from 1.0 to 1.3 | Adjusts vertical spacing between text lines. | Verified |
| SCN-453 | Simple | PLN | Letter Spacing / Tracking Adjustment | Text selected | Adjust tracking from 0 to 2px | Spreads characters apart for improved dot-matrix ink readability. | Verified |
| SCN-454 | Medium | PLN | Dynamic Currency Prefix Localization | Token `{MRP}` | Select currency "INR (₹)" vs "USD ($)" | Outputs correct symbol and decimal placement. | Verified |
| SCN-455 | Simple | PLN | Lock Element from Accidental Drag | Element selected | Click "Lock" padlock icon | Locks element position and dimensions; prevents dragging on canvas. | Verified |
| SCN-456 | Simple | PLN | Unlock Locked Element | Locked element | Click "Unlock" icon | Restores drag and edit capabilities. | Verified |
| SCN-457 | Simple | PLN | Duplicate Element | Element selected | Press `Ctrl+D` | Clones element with 2mm offset. | Verified |
| SCN-458 | Simple | PLN | Delete Element | Element selected | Press `Delete` or `Backspace` | Removes element from canvas and layer tree. | Verified |
| SCN-459 | Medium | PLN | Select Multiple Elements | Canvas loaded | Hold `Shift` + click 3 elements | Group selection box encloses all 3 elements. | Verified |
| SCN-460 | Medium | PLN | Align Left Across Multiple Elements | 3 elements selected | Click "Align Left" | Aligns all selected elements flush to the leftmost element's X coordinate. | Verified |
| SCN-461 | Medium | PLN | Distribute Vertically Evenly | 3 elements selected | Click "Distribute Vertically" | Equalizes vertical gap between the 3 elements. | Verified |
| SCN-462 | Medium | PLN | Group Elements | 2 elements selected | Press `Ctrl+G` | Bundles elements into group folder in layer tree. | Verified |
| SCN-463 | Medium | PLN | Ungroup Elements | Group selected | Press `Ctrl+Shift+G` | Dissolves group back into individual canvas elements. | Verified |
| SCN-464 | Simple | PLN | Element Visibility Toggle (Eye Icon) | Layer tree visible | Click eye icon next to layer | Hides element from canvas without deleting it. | Verified |
| SCN-465 | Complex | PLN | Token Fallback Handling when Batch Unset | No batch selected in preview | Render canvas | Displays token names in brackets (e.g. `[BATCH]`, `[MFD]`) without throwing null errors. | Verified |

---

## 3. Shapes, Lines & Graphic Elements (SCN-466 – SCN-500)

| ID | Tier | Persona | User Story / Intent | Preconditions | Action Steps | Expected Visual & Logical Outcome | Status |
|---|---|---|---|---|---|---|---|
| SCN-466 | Simple | PLN | Add Horizontal Divider Line | Toolbar | Click "Add Line" | Inserts 1px black horizontal divider line. | Verified |
| SCN-467 | Simple | PLN | Change Line Thickness | Line selected | Set stroke width to 2px (0.5 mm) | Thickens line stroke cleanly. | Verified |
| SCN-468 | Simple | PLN | Change Line Style to Dashed | Line selected | Set stroke style to "Dashed" | Renders dashed perforation / fold reference line. | Verified |
| SCN-469 | Simple | PLN | Change Line Style to Dotted | Line selected | Set stroke style to "Dotted" | Renders dotted separator line. | Verified |
| SCN-470 | Simple | PLN | Add Rectangle / Border Box | Toolbar | Click "Add Rectangle" | Inserts rectangle box outline. | Verified |
| SCN-471 | Simple | PLN | Adjust Rectangle Corner Radius | Rectangle selected | Enter border radius `4` mm | Rounds rectangle corners. | Verified |
| SCN-472 | Simple | PLN | Filled vs Outlined Rectangle | Rectangle selected | Toggle "Fill: Black" with "No Border" | Creates solid black backdrop box. | Verified |
| SCN-473 | Medium | PLN | Regulatory Veg / Non-Veg Green Square | Toolbar | Click "Veg Green Symbol" | Inserts standard green square border with solid green circular dot inside. | Verified |
| SCN-474 | Medium | PLN | Regulatory Non-Veg Brown Triangle | Toolbar | Click "Non-Veg Symbol" | Inserts brown square with equilateral brown triangle inside. | Verified |
| SCN-475 | Simple | PLN | Add FSSAI Logo Placeholder | Toolbar | Click "Add FSSAI Logo" | Inserts standard vector FSSAI logo symbol with license number text container below. | Verified |
| SCN-476 | Medium | PLN | Bind FSSAI License Number Token | FSSAI element | Insert `{FSSAI_LICENSE}` token | Renders "Lic. No. 10020021000123" under logo. | Verified |
| SCN-477 | Simple | PLN | Upload Monochrome Bitmap Graphic | Toolbar | Click "Upload Image", select `logo.png` | Ingests image, binarizes to 1-bit monochrome, and places on canvas. | Verified |
| SCN-478 | Complex | MNT | Threshold Slider for Uploaded Bitmaps | Grayscale logo uploaded | Adjust binarization threshold (0-255) | Live re-dithers graphic so user can optimize clarity for thermal printhead. | Verified |
| SCN-479 | Simple | PLN | Resize Graphic Proportionally | Graphic selected | Drag corner handle while holding `Shift` | Scales image width and height maintaining exact aspect ratio. | Verified |
| SCN-480 | Complex | MNT | High Resolution Raster Ingestion Check | Upload 2400x1200 bitmap | Observe canvas rendering | Resamples to native printer DPI without memory crash. | Verified |
| SCN-481 | Simple | PLN | Reorder Layers: Bring to Front | Element selected | Click "Bring to Front" or `Ctrl+]` | Moves element to top of layer stack. | Verified |
| SCN-482 | Simple | PLN | Reorder Layers: Send to Back | Element selected | Click "Send to Back" or `Ctrl+[` | Moves element behind all other canvas items. | Verified |
| SCN-483 | Medium | PLN | Reorder Layers by Dragging in Tree | Layer tree visible | Drag layer row above sibling row | Reorders canvas rendering stack immediately. | Verified |
| SCN-484 | Simple | PLN | Rename Layer in Tree | Double-click layer title | Type "MRP Box" | Updates descriptive label in layer tree. | Verified |
| SCN-485 | Medium | PLN | Delete Multiple Elements Simultaneously | 4 elements selected | Press `Delete` | Deletes all 4 selected elements in single undoable action. | Verified |
| SCN-486 | Complex | PLN | Canvas Template Export to JSON | Designer open | Click "Export Template (JSON)" | Downloads template definition containing all elements, tokens, and machine rules. | Verified |
| SCN-487 | Complex | PLN | Canvas Template Import from JSON | Designer open | Click "Import Template", select JSON file | Reconstructs canvas elements, fonts, and bindings with 100% fidelity. | Verified |
| SCN-488 | Simple | PLN | Canvas Quick Save (Ctrl+S) | Edits made | Press `Ctrl+S` | Saves template state to IndexedDB `db.templates`; shows green saved toast. | Verified |
| SCN-489 | Simple | PLN | Unsaved Changes Warning | Edits unsaved | Attempt to navigate to Products | Confirmation dialog: "You have unsaved template edits. Leave anyway?" | Verified |
| SCN-490 | Medium | PLN | Discard Template Edits | Unsaved dialog open | Click "Discard" | Reverts to last saved template version and completes navigation. | Verified |
| SCN-491 | Simple | PLN | Live Preview Toggle with Real Batch Data | Designer open | Select "Batch ADTP-2026-001" from preview dropdown | Canvas re-renders instantly with real live batch values! | Verified |
| SCN-492 | Simple | PLN | Live Preview Toggle with Second Batch | Dropdown visible | Select "Batch ADCP-2026-003" | Canvas updates values to Coriander Powder, new dates, and new MRPs instantly. | Verified |
| SCN-493 | Complex | QAC | Prevent Text Truncation in Live Preview | Batch ID has 20 characters | Observe rendered text box | Auto-fit or wrap prevents characters from being cut off. | Verified |
| SCN-494 | Simple | PLN | Fullscreen Canvas Mode | Toolbar | Click "Fullscreen" icon | Expands canvas to fill entire monitor for focused design work. | Verified |
| SCN-495 | Simple | PLN | Exit Fullscreen Mode | Fullscreen active | Press `Escape` or click exit icon | Restores standard studio layout. | Verified |
| SCN-496 | Medium | PLN | Template Cloner | Active template open | Click "Save As New Template" | Creates deep clone with unique ID and name prompt. | Verified |
| SCN-497 | Simple | PLN | Template Revision Counter | Template saved | Inspect metadata | Increments `revision: 2`, `lastModified: <timestamp>`. | Verified |
| SCN-498 | Complex | MNT | Canvas Render Performance Benchmark | 50 elements on canvas | Drag element rapidly | 60 FPS smooth rendering via HTML5 Canvas hardware acceleration. | Verified |
| SCN-499 | Simple | PLN | Designer Keyboard Shortcuts Help | Designer open | Press `?` | Opens cheat sheet filtered to Designer commands. | Verified |
| SCN-500 | Complex | PLN | Volume 5 Designer Milestone Check | Full design workflow | Create layout from scratch, add text, tokens, line, logo, and save | 100% verified canvas state and data model compliance. | Verified |
