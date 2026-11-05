# 07 — History, Audit Trail, Job Detail, and Exact Reprint

## Current behavior and confirmed defects

- `src/components/history/HistoryView.tsx` presents the log as immutable and reproducible, but the app does not persist actual print-job snapshots. The `printJobs` table exists in `src/services/db.ts`, but source search shows no normal print flow writing print jobs.
- “Reprint Exact” navigates back to the current Print workflow. It re-resolves today's live template and data, so edits made after the original run can change the supposedly exact output.
- The visible history filtering is narrowly hardcoded (Completed and a specific seed batch); it is not a genuine history query/filter system.
- `packsPrinted || expectedPacks` treats a legitimate zero as if all expected packs had printed.
- Duplicate-batch logic uses a derived hardcoded ID/prefix and preserves allocation IDs / original batch references, creating identity collision and relationship-integrity risks.
- There is no complete print attempt timeline, operator identity, transport receipt, device acknowledgement, or verified-good/rejected count.

## Replace the current history concept with three linked concepts

### 1. Business batch ledger
One row per production batch, with product, lot, manufactured/expiry dates, raw material quantity, allocated packs, consumed amount, balance, current status, created/updated by, and reconciliation history. Do not conflate batch state with print-job state.

### 2. Immutable print jobs
One row per actual requested print job, containing frozen business values, frozen template/layout JSON, selected profile snapshots, renderer version, rendered file references/checksums, quantity/pass plan and originating batch allocation. The job is append-only; corrections create a new job or amendment event.

### 3. Print attempts and verification events
A print job can have multiple attempts. Each attempt records transport, device, requested/transmitted/acknowledged count, response, error and retry relation. Physical verification is a separate event with good/rejected counts and operator/supervisor identity.

## History page specification

### Search and filtering
- Search: job ID, batch/lot ID, product, SKU, pack size, operator, printer/device, template name.
- Date range: created, printed, verified, manufactured.
- Status: draft, preflight failed, queued, printing, accepted, completed, partially completed, failed, cancelled, unknown, manually verified.
- Filters: product, SKU, machine profile, transport, operator, batch, allocation, error present, exact reprint available.
- Sort by newest/oldest, batch ID, product, quantity, status; preserve selection while changing a sort.
- Pagination or virtualized list; show total result count and current filters. Do not silently hide records.

### Job detail drawer/page
Display a structured summary of the immutable print snapshot, output preview, file download links, checksum, template version, machine/pack profile snapshots, attempt timeline, device response and physical verification. Clearly distinguish source data as it existed at print time from current master data.

### Actions
- **View snapshot:** opens read-only job snapshot, not live Designer.
- **Download original output:** downloads byte-identical artifact.
- **Reprint exact:** reuses exact original file and settings where safe; still creates a new attempt and requires a preflight for device compatibility. Explicitly disclose when exact hardware/profile is no longer available.
- **Reprint with current data:** creates a new job based on current product/batch/template values. Never label this exact.
- **Duplicate batch:** creates new batch ID and new allocation IDs; references are rebuilt; no IDs from the original are reused.
- **Export audit:** scoped CSV/JSON with date, filters, and schema version; sensitive data policy applied.
- **Correct record:** append a correction event with reason; do not mutate original print facts.

## Identity and integrity requirements

- IDs are generated centrally using UUID/ULID or a DB sequence; never derived from short human codes alone.
- `batchId` is a human-friendly unique identifier with a DB unique constraint. Internal immutable primary key is separate.
- Every allocation has a new internal ID and references the new batch ID.
- Counts use explicit `null`/0 semantics; never use `||` when zero is valid.
- Every event stores actor, timestamp, event type, entity ID, before/after or payload, and correlation ID.
- Append-only audit events are protected server side in multi-user deployment. Local single-user mode can only claim tamper-evident, not tamper-proof, unless storage is protected.

## Human operator experience

An operator should be able to answer quickly: “What did we print, for which lot and SKU, how many labels were actually produced, on which printer, who ran it, did it succeed, and can I reprint the exact same output?” Present the status in words, not color alone. Make errors and unknown results obvious. Do not expose “immutable” or “100% reproducible” promises until the stored evidence makes those statements true.

## Acceptance criteria

1. Changing a product MRP, template or machine profile after a completed job does not change that job's snapshot or original output.
2. Exact reprint downloads/dispatches the stored rendered file, not a newly rendered live template.
3. New print attempts never overwrite old attempts.
4. Duplicate batch operation produces unique batch/allocation/internal IDs and valid foreign keys.
5. A zero printed quantity remains zero.
6. History filters query real data and survive pagination/sorting predictably.
7. Every completed/failed/unknown job is auditable with who, when, what, where and why.
