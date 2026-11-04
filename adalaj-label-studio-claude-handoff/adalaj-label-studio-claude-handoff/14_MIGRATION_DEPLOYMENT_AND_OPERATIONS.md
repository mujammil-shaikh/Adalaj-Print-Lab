# 14 — Migration, Deployment, Backup, and Operational Readiness

## Deployment decision must be explicit

Choose one supported operating mode before building infrastructure:

**A. Single workstation/local-only:** Dexie or local SQLite; one trusted computer; no multi-user claims. Add robust local backups, data migrations and local print agent. Clearly state that data is stored on this browser/device and not shared.

**B. Shared production system:** authenticated web app + API + PostgreSQL + central file storage + local print agent at each print workstation. Use role-based permissions and audit logs. This is the right architecture if multiple operators/devices need one source of truth.

Do not create a half-server that still stores authoritative data only in each browser while implying centralized operation.

## Suggested delivery phases

### Phase 0 — Stabilize current application
- Preserve source ZIP and branch baseline.
- Record build/type errors after clean dependency install.
- Add test framework and establish baseline.
- Fix fake success, fake barcode/QR, fallback business values, allocation routing and data transactions.
- Label unsupported printer flows accurately.

### Phase 1 — Data and workflow foundation
- Introduce domain services and repository interfaces.
- Add schema versioning, migrations and uniqueness constraints.
- Fix batch/SKU/allocation identifiers and quantity accounting.
- Add print-job snapshots, attempts and audit events.
- Add router and shared command/action registry.

### Phase 2 — Designer and render correctness
- Standardize mm/device-pixel coordinate model.
- Unify preview/export/print pipeline.
- Implement true symbologies and image asset lifecycle.
- Repair fit engine, pass planner and multi-pass export.
- Add golden image and file tests.

### Phase 3 — Hardware and operator controls
- Build local print agent and versioned device profiles.
- Validate transport and acknowledgement with specific printers.
- Add preflight, manual physical verification and retry safety.
- Add machine/pack calibration wizard and backup restore UX.

### Phase 4 — Production UX and release
- Complete page redesign/accessibility/responsive states.
- Conduct user observation and training.
- Perform restore drill, printer acceptance and security review.
- Roll out to pilot users, then staged production.

## Migration safety

- Every schema migration has a version, precondition, deterministic up path and tested rollback/backup restore strategy.
- Run migration against a copy of real representative data before production.
- Keep old schema backup and checksum; do not auto-delete old data.
- Migration should report imported/skipped/rejected rows with reasons.
- Do not silently repair unknown records; provide a repair report for human review.
- Avoid `bulkPut`-only import when related entities require referential validation and rollback.

## Operational controls

- Health check for API and print agent separately.
- Structured logs with correlation IDs; redact keys and sensitive values.
- Printer compatibility matrix and firmware/profile version.
- Database backup schedule plus off-device copy and restore drill.
- Alert for failed backups, print-agent offline, repeated transport failures, migration failure and storage quota.
- Retention policy for rendered print files and audit data.
- Support bundle includes app version, browser/OS, machine profile, adapter diagnostics and anonymized error details.
- Feature flags for new renderer/transport; rollback plan for known printer regressions.

## User-facing operational language

Distinguish: `Saved on this device`, `Synced to server`, `Print agent online`, `Printer connected`, `Job transmitted`, `Device acknowledged`, `Output physically verified`. Never combine them in a single “Ready” status. Tell operators where data lives and what happens if the workstation/browser is cleared.
