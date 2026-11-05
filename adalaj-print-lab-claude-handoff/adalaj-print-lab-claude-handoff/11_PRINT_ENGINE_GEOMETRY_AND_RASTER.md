# 11 — Designer Fit Engine, Pass Planner, Geometry, and Raster Renderer

## High-risk implementation findings

### `src/services/printTransform.ts`
- BMP headers hardcode 11811 pixels/metre (300 DPI), even where the active machine DPI differs.
- Rendering uses average of X/Y dpmm in places, which can distort output when printer DPI is non-square or profile values differ.
- Download orientation and printer-view transform paths differ; Designer may request rotation in a context where renderer applies it only for printer view.
- First-time image load is synchronous and checks `Image.complete`, so an uncached image can be omitted in the initial render.
- The symbol renderer does not provide a real symbol implementation.
- Invert changes text foreground but does not create the corresponding black background region.
- QR and barcode branches draw decorative pseudo-random bars; they are not valid symbologies.

### `src/services/fitEngine.ts`
- Text fitting approximates character count rather than measuring the actual font and rendered content.
- “Fit selected” can reflow all objects rather than only the selected objects.
- Some layout patterns use fixed 3-column or hard-coded millimetre assumptions.
- Strip layouts do not comprehensively validate feed/travel limits.
- Geometry validation uses simplified axis-aligned boxes; rotated object bounds and actual image/text bounds are not validated.
- Negative coordinates, clipping, print window bounds, barcode quiet zones, image-load status and font substitution are insufficiently covered.

### `src/services/passPlanner.ts`
- Planner rules and template/machine constraints can disagree; one branch uses machine band independently of the selected template override.
- Empty-object cases can create negative intermediate travel/gap calculations.
- Vertical stack splitting uses hard-coded halves/lengths rather than a general fit calculation.
- The planner can describe multiple passes while export still creates a single pass artifact set.

## Target coordinate model

Choose one canonical coordinate system and make conversions explicit:

- Authored geometry in physical millimetres (`xMm`, `yMm`, `widthMm`, `heightMm`, rotation degrees).
- Raster renderer converts mm to device pixels using independent `dpiX` and `dpiY` (or independent `dpmmX`, `dpmmY`).
- Store a top-left origin convention in the template schema. Hardware profile provides physical printable origin and feed direction; apply it exactly once in the print transform.
- Do not use CSS pixels, browser zoom or screen calibration to alter saved physical artwork geometry.
- Use rotated polygons or conservative axis-aligned bounding boxes for collision checks, but document which model is used.

## Render pipeline contract

1. Load immutable template revision and resolved data values.
2. Resolve all fonts, images, symbols and symbologies asynchronously.
3. Validate required values and missing assets.
4. Compute physical geometry and transform (orientation, mirroring, origin offsets) once.
5. Generate deterministic device pixel canvas at exact X/Y DPI.
6. Apply colour/inversion, dithering/thresholding and 1-bit conversion as profile requires.
7. Generate BMP or device-native raster with correct header/resolution metadata.
8. Decode/inspect barcode and QR output when possible.
9. Produce deterministic output hash, dimensions, byte count and renderer version.
10. Store the output and bind it to immutable print job snapshot.

Renderer API should be pure and async where assets are loaded, e.g. `renderJob(snapshot, machineProfile): Promise<RenderedArtifact[]>`. UI should not call separate hidden transform paths for preview vs download vs printer. Provide preview at display scale, but all three must derive from the same physical geometry and output raster.

## Fit engine redesign

- `fitSelection(objects, selectedIds, constraints)` must only alter explicitly selected objects.
- Fit proposals carry before/after geometry and reason; no silent layout rewrite.
- Text uses actual font metrics and final resolved string, not just placeholder character count.
- Barcode/QR uses encoder-reported dimensions and quiet-zone constraints.
- Images preserve aspect ratio unless explicit crop/stretch mode is selected.
- Constraints include media width/height, pack printable window, machine travel, band length, feed orientation, margins, object spacing and minimum readable type size.
- Support “fit selected”, “fit all”, “distribute”, “align”, “center”, “snap to safe area” as separate explicit commands.
- Detect overlap, out-of-bounds, hidden/off-canvas, zero-size, too-small, clipped, too-close, unrenderable font/image and unsupported symbol.
- Explain each failure in plain language and offer one-click “select object” / “show constraint”.

## Pass planning redesign

Treat pass planning as a constraint solver over machine travel length, label pitch, printable window, objects and feed limits. Each planned pass has explicit object IDs, start/end positions, feed distance, overlap/gap, expected labels, waste/setup allowance and unique output artifact. If impossible, return an error rather than hard-coded “split into two”. Zero-object plan is a clear empty/error state, never negative travel.

The exporter must consume the exact `PassPlan` object. The planner and ZIP manifest must not independently invent pass count or metadata.

## Golden test fixtures

Create fixtures covering:
- Portrait/landscape, mirrored and rotated artwork.
- Different DPI X and DPI Y.
- Non-zero origin offsets and calibration correction.
- Fonts available/missing/substituted; long and localized text.
- Image not yet loaded, corrupt image, transparent image, huge image.
- 1D barcode types, QR, Data Matrix if supported, invalid checksums, long payloads.
- Black/white inversion and 1-bit threshold/dither.
- 1, 2, 3, many passes; zero objects; object beyond limit; tiny gap; stack and strip layouts.
- Exact BMP header width, height, row padding, bit depth, image size, resolution and actual byte count.

Acceptance is not merely “canvas looks plausible”. Pixel/file outputs must match expected dimensions and generated codes must decode to exact payloads.
