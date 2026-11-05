# 10 — Architecture, Data Integrity, Backend, and Security

## Current architecture as submitted

- React 19 + TypeScript + Vite client.
- Dexie/IndexedDB (`AdalajLabelStudioDB`) is the operative persistence layer.
- `src/App.tsx` loads domain tables directly into component state and passes callbacks into very large views.
- No server entrypoint/API implementation is present in the archive despite `express` being in dependencies. No shared database, authentication, RBAC, tenant boundary or server-side audit API is implemented.
- `@google/genai` is present, but the current prompt path does not perform a live model call. Environment example and source key conventions are inconsistent; a `VITE_` secret is browser-visible.
- There are no automated test dependencies/scripts in `package.json`.
- App navigation is view state rather than URL routing. State, persistence, business logic and UI callbacks are coupled in a large root component.

This architecture can be acceptable for a clearly disclosed single-browser prototype. It is not a central production system for multiple operators or workstations.

## Data-integrity defects confirmed

1. Database initialization seeds data based on a business-record count. A partially initialized database may not be healed table by table.
2. After SKU seeding/updating, code sets stale `skuList` rather than the verified updated collection, so the UI state can differ from persisted data.
3. Several multi-record operations are separate writes rather than one transaction (product plus SKUs, batch plus allocations, backup import).
4. Human-readable batch/SKU codes are used to derive IDs without robust uniqueness enforcement.
5. UI fallback values can mask missing master data and permit incorrect printed output.
6. Batch stock, allocations, printed counts and loose stock are calculated in multiple components rather than one domain service, increasing divergence.
7. `localStorage` stores display calibration independently from the structured DB and without a schema/version/validation contract.

## Recommended target architecture

### Frontend layers

- **Route/page layer:** screens, view-model hooks, loading/error/empty states. No direct Dexie/SQL calls.
- **Application command layer:** typed commands such as `CreateProduct`, `CreateBatch`, `AllocatePacks`, `PreparePrintJob`, `RecordAttempt`, `VerifyOutput`, `DuplicateBatch`, `RestoreBackup`.
- **Domain layer:** pure calculations and invariants (quantity reconciliation, date policy, MRP validation, pack conversion, fit/geometry, pass planning, print readiness).
- **Repository layer:** interfaces for products, SKUs, batches, templates, profiles, media, print jobs, attempts and audit.
- **Infrastructure adapters:** IndexedDB/local API/server API, file storage, print agent, camera/measurement, AI proxy.

### Backend (when multiple operators or shared records are required)

- API: REST or typed RPC with versioned schemas and structured error codes.
- Database: PostgreSQL for multi-user production; migrations and unique/foreign-key/check constraints. If deployment is a single workstation without network, use a local service and SQLite with equivalent constraints, then add an explicit sync architecture only if needed.
- Auth: session-based authentication and role-based permissions (Operator, Catalog Manager, Designer/Engineer, Supervisor/Admin). Do not trust role flags supplied by client.
- Transactions: product/SKU creation, batch/allocation updates, print job creation, backup restore and inventory reconciliation must be atomic.
- Audit: append-only server events with actor, timestamp, entity, action, correlation ID and reason.
- Print service: local agent with a narrow authenticated API; it executes device-specific protocols and returns real transport status. Browser must not attempt arbitrary raw TCP.
- Files: durable output/media storage with content hash, retention policy, access permissions and backup.

## Domain data model (minimum)

- `Product`: immutable internal ID, display name, brand, product code, active/archive status, regulatory metadata.
- `Sku`: internal ID, unique SKU code, product FK, normalized pack quantity + unit, MRP (explicit optional/required policy), barcode type/value, active status.
- `Batch`: internal ID, unique human batch/lot number, product FK, manufactured date, expiry/best-before date, raw input quantity/unit, state, actor metadata.
- `BatchAllocation`: internal ID, batch FK, SKU FK, planned pack count, computed allocated weight, printed/verified/good/rejected counts, status.
- `Template`: internal ID, product/SKU scope, version, canvas size, objects with stable IDs, geometry, style, content bindings, symbology configuration, saved state, author.
- `MachineProfile`: versioned protocol/physical capability profile.
- `PackProfile`: versioned measured printable window/calibration per pack/machine as required.
- `PrintJob`: immutable job snapshot (see `06_PRINT_HARDWARE_AND_EXPORT.md`).
- `PrintAttempt`: immutable individual transport attempt.
- `AuditEvent`: append-only event journal.
- `MediaAsset`: blob reference, media type, checksum, dimensions, size, createdBy.
- `AppPreference`: user/workstation-scoped settings, schema version.

## Required invariants

- A SKU pack amount must be positive and normalized to a canonical unit (e.g. grams); conversion is done once in a domain function.
- Batch raw quantity must be positive and unit explicit.
- Sum of allocations cannot exceed available raw quantity unless an explicit waste/yield policy accounts for it.
- Expected pack count must never be silently forced to one if calculated as zero or invalid.
- Printed count, device-acknowledged count and physically verified count are separate numbers.
- Batch ID, SKU code, allocation ID and print-job ID have distinct identity responsibilities.
- MRP is either a validated amount or absent with a clear state. It must not become a UI fallback.
- Dates are parsed as calendar dates in the configured business timezone, not via accidental UTC shifts.
- Writes that change more than one entity use one transaction and emit an audit event atomically.

## Validation, errors and observability

Use typed result objects (`success`, `data`, `errorCode`, `message`, `fieldErrors`, `correlationId`). Do not swallow errors to console. Provide field-level validation in UI and authoritative validation in API/domain command. Log technical diagnostics without secrets or unnecessary personal data. Add structured metrics for failed writes, print transport failures, stale preview attempts, backup outcomes and sync conflicts.

## Security checklist

- No API secrets in `VITE_*` variables or client bundles.
- Validate and sanitize imported JSON/CSV, image files and AI proposal payloads.
- Restrict image file type, byte size, pixel dimension and decompression resource usage.
- Use CSP and secure headers in production hosting.
- Enforce authorization for every mutating API operation.
- Protect backup exports, logs and print artifacts from unintended access.
- Avoid executing arbitrary imported HTML/SVG/script or model-generated code.
- Use HTTPS for remote APIs; local print agent uses authenticated loopback/origin token and pairing.
- Add backup retention, restore drills and encryption at rest where required.

## Migration approach

Start with repository interfaces and domain commands while keeping Dexie as the first adapter. Add schema versioning and transactions now. Introduce a backend behind the same interfaces when the operating model requires shared multi-user data. Do not add a pretend Express server without authentication, migrations, tests, health checks and deployable configuration.
