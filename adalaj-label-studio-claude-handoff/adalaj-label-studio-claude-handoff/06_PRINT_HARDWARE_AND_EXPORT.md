# 06 — Print Center, Hardware, Proof, and Export

## Objective
A print action must be safe, explainable, reproducible, and truthful. The UI must never call a job printed merely because a button was clicked or a file was generated.

## Confirmed defects in the submitted source

| ID | Severity | Current implementation / evidence | Required correction |
|---|---|---|---|
| PR-01 | P0 | `src/services/hardwareAdapters.ts`: network adapter uses browser `fetch` with `mode: 'no-cors'` for a raw printer endpoint, cannot read the response, and its catch path returns success. | Remove this as a production raw-TCP implementation. Use a local print agent or authenticated server-side print service with explicit protocol and acknowledgement. A failed/unknown result must remain failed/unknown. |
| PR-02 | P0 | `dispatchPrintJob` can report a successful network dispatch without verified device acceptance. | Model `queued`, `connecting`, `transmitting`, `device-accepted`, `completed`, `failed`, `cancelled`, `unknown`. Only move to accepted/completed from an actual protocol response. |
| PR-03 | P0 | `PrintView.handleMarkAsPrinted` can mark the expected quantity printed after the operator action; it does not require a print-job acknowledgement or observed output. | Separate “mark manually verified” from “printer confirmed”. Require explicit operator count and confirmation for manual completion. Store who/when/how. |
| PR-04 | P0 | Barcode and QR are rasterized as pseudo-random bars rather than standards-compliant symbols in `src/services/printTransform.ts`. | Generate real symbologies through a maintained encoder. QR data must be QR-encoded; barcode type, checksum, quiet zones, human-readable text, and module sizing must be explicit. Decode generated outputs in tests. |
| PR-05 | P1 | USB adapter requests any device with empty filters, assumes configuration 1/interface 0/endpoint 1, and sends bytes without a printer-specific command protocol. | Introduce tested device profiles: vendor/product IDs, interfaces, endpoints, initialization, raster framing, status, feed/cut commands, acknowledgement, reconnect, and cancellation. Unknown device = unsupported, not “connected printer”. |
| PR-06 | P1 | BLE accepts every device and picks the first writable characteristic; fixed 512-byte chunks are not a validated printer transport. | Whitelist known services/characteristics and protocol profiles. Negotiate MTU/chunk size, await write acknowledgements, throttle, recover disconnects, and show unsupported devices. |
| PR-07 | P1 | ZIP export emits a single BMP pair while manifest/pass planning can describe multiple passes; manifest content can disagree with files. | Export one artifact for every planned pass, deterministic file names, matching manifest, pass-specific payloads and checksums. Validate archive integrity before download. |
| PR-08 | P1 | ZIP descriptions are hardcoded as “Pass 1 of 1” even when `passPlan` describes more passes. | Make descriptions and manifest generated from the same immutable pass plan. |
| PR-09 | P1 | UI presents raw TCP 9100 as a direct browser action although browsers cannot open arbitrary raw TCP sockets. | Label network print as “via local print agent” and show agent status/version, configured printer, protocol, last health check and job acknowledgement. |
| PR-10 | P1 | USB-drive path reports ready but does not write a drive; it relies on downloading a ZIP for the user to copy. | Label it accurately as “Download files for USB drive”. Do not display a “written to drive” state. |
| PR-11 | P1 | Template resolution in `App.tsx` is based on the first allocation even when another allocation is selected. Navigation to print drops the selected allocation ID. | Carry `batchId` + `allocationId` through navigation and resolve the exact allocation SKU/template. Never silently fall back to allocation zero. |
| PR-12 | P1 | Print preview uses fallback MRP and fabricated default dates. | Print readiness blocks unresolved business values. No default MRP/date/lot number may reach final artwork. |
| PR-13 | P1 | `updatePreview` failure is console-only; operator may see stale preview. | Show an inline blocking render error with retry and preserve last valid preview marked stale. Disable print/download until current revision renders. |
| PR-14 | P1 | “Repair all” can alter geometry before the operator understands the impact; direct exports can bypass a clear readiness gate. | Offer proposed changes with before/after preview and per-change acceptance. A single preflight gate must protect print, USB, ZIP, and direct export. |
| PR-15 | P2 | Mark printed can set status/quantity using expected packs rather than actual verified output. | Record requested, transmitted, accepted, verified, good, rejected, and remaining quantities independently. |

## Required Print Center information architecture

1. **Job identity strip:** product, SKU/pack size, batch/lot, MRP, manufacture date, best-before date, allocation, label dimensions, selected machine/profile. Values must come from validated records, not hard-coded defaults.
2. **Quantity & run plan:** requested labels, copies per pack, number of packs, planned passes, labels per pass, expected waste/setup labels, remaining quantity.
3. **Large preview:** exact output at target dimensions, zoom controls, safe-zone/print-window overlay, barcode/QR decode state, stale/current revision indicator.
4. **Preflight checklist:** data completeness, template integrity, dimensions, DPI, barcode/QR, quiet zones, printer compatibility, machine calibration, pass plan and output count.
5. **Transport card:** exact interface (USB/BLE/local agent/download), device identity, connection state, configured protocol, last ping, job response and error.
6. **Job activity:** stage timeline with timestamps and operator; stop/cancel/retry controls only when supported by the transport.
7. **Completion & reconciliation:** device-acknowledged count vs operator-verified physical count, good/rejected labels, remaining labels, explicit disposition.

## Button and control contract

| Control | Correct behavior | Failure behavior |
|---|---|---|
| Refresh preview | Re-render current saved revision and update freshness timestamp. | Show actionable error; keep prior preview visibly stale. |
| Run preflight | Run deterministic validation and list every blocking/warning item with a direct “fix” link. | Never silently pass a validator exception. |
| Repair suggestion | Show proposed geometry change and preview; require operator/design approval. | Roll back if layout validation fails. |
| Download BMP | Export exact dimensions, DPI and orientation; filename includes job identity and revision. | No download if render or preflight is invalid. |
| Download pass ZIP | One file per planned pass + manifest + checksums; validate count. | Abort archive creation if any pass fails. |
| Connect printer | Connect only to a configured supported profile and show verified device identity. | Keep connection state as failed/unsupported, not connected. |
| Start print | Create immutable job record first; then dispatch using the supported protocol. | Preserve failed/unknown attempt with actionable error and retry safety. |
| Cancel | Send supported cancellation and record the actual result. | If unsupported, state “cannot cancel transport already sent”; never fake cancellation. |
| Mark physically verified | Require actual observed counts and supervisor/operator identity policy. | Leave printer-confirmed and physical counts distinct. |

## Data model additions

`PrintJob` should snapshot: id, createdAt, operatorId, productSnapshot, skuSnapshot, batchSnapshot, allocationSnapshot, templateSnapshot, machineProfileSnapshot, packProfileSnapshot, requestedQuantity, copiesPerPack, plannedPasses, rendererVersion, symbologyVersions, renderedFileRefs/checksums, transportType, deviceIdentity, attemptIds, finalState, acknowledgement, manualVerification, good/rejected counts. Store render artifact content-addressed or in durable object/file storage; never reconstruct “exact reprint” from live records.

`PrintAttempt` should have attemptNo, queuedAt, startedAt, finishedAt, bytes, response/status, errorCode, retryOf, operatorId and idempotencyKey. A retry must not double-count completed output.

## Print readiness rules

- Block if required MRP/date/lot/SKU/template/pack profile is absent or inconsistent.
- Block if barcode/QR is not standards-encoded or fails decode/quiet-zone checks.
- Block if print dimensions/DPI/orientation are unknown or incompatible.
- Block if selected allocation and resolved template do not match.
- Block if render revision differs from current editor revision.
- Warn on low contrast, small type, tight margins, uncalibrated profile or pass-plan risk.
- Print output is traceable to the exact source snapshots and renderer version.

## Implementation sequence

1. Correct truthful result states and remove fake success paths.
2. Add print job/attempt persistence and idempotency.
3. Replace pseudo symbols with real barcode/QR encoders and decoder tests.
4. Repair template/allocation selection propagation.
5. Reconcile pass planner with one output per pass and validate ZIP contents.
6. Define supported printer profiles; build a local print agent for raw TCP and constrained device protocols.
7. Add preflight UX, operator verification and supervisor policy.
8. Test every supported printer/media combination physically; publish a compatibility matrix.

## Acceptance criteria

- Network failure cannot produce a success state.
- Browser UI never claims it wrote raw TCP data directly.
- QR and barcode output decodes to the exact intended payload.
- A 3-pass plan exports exactly 3 pass artifacts and a manifest listing exactly those files.
- A selected second allocation prints the second allocation's SKU/template, not the first allocation's.
- No unresolved fallback business values are printable.
- Print job can be reopened/reprinted byte-for-byte from saved snapshots after product/template changes.
