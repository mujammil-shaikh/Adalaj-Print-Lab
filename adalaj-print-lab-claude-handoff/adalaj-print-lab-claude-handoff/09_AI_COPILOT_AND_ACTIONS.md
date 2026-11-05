# 09 — AI Copilot, Proposal Safety, Action Registry, and Global Commands

## Confirmed implementation gaps

- `src/services/aiCopilot.ts` creates a Google GenAI client when a key exists, but the actual `processPrompt` path is deterministic keyword/branch parsing and does not make a model request. Calling this “AI-powered” without explaining the rule-based behavior is misleading.
- Parser behavior contains hardcoded product/batch examples and may generate allocations inconsistent with the requested pack-size/quantity combination.
- Proposal application is not a complete domain command path. The `applyChanges` function writes an audit event; it does not itself execute every proposed batch/allocation change. The UI can imply a proposal was applied when only an event was stored.
- The proposal workflow can mark proposals auto-approved; destructive/financial/production changes need explicit human confirmation and server-side validation.
- Action registry only registers a small set of shell actions; key editor, batch, print and history actions are not consistently available through it.
- Shortcut display/remapping and global keyboard handling are separate implementations and can disagree.

## Product positioning
Either implement a real AI integration securely, or rename the feature as “Guided Assistant / Quick Actions” until it is real. Do not expose an API key in a `VITE_` client environment variable. A real model request must happen through a trusted server/proxy; prompt data must be minimized and secrets never shipped to browser bundles.

## Correct proposal lifecycle
1. **Interpret:** parse natural language into a typed proposal with explicit assumptions and confidence.
2. **Resolve:** retrieve current product/SKU/batch records; show ambiguity when multiple matches exist.
3. **Preview:** render a human-readable before/after table with all affected records and quantities.
4. **Validate:** run the exact same domain validators as manual UI; verify stock math, duplicate IDs, SKU existence, MRP policy, dates and allocation constraints.
5. **Approve:** require user review. Require elevated approval for deleting, overwriting, finalizing batch, applying MRP changes or dispatching print.
6. **Execute:** call a real typed application command/service in a DB transaction. The operation returns changed entity IDs and final persisted state.
7. **Verify:** reread affected records, show what changed, and allow audit inspection.
8. **Undo/compensate:** where safe, offer a compensating action; never pretend an irreversible physical print can be undone.

## Command contract
A proposal should use a discriminated union, for example:

- `CreateBatchProposal`
- `AddAllocationProposal`
- `UpdateProductMrpProposal`
- `ChangeTemplatePropertyProposal`
- `FitLayoutProposal`
- `PreparePrintProposal`

Each proposal has `proposalId`, `schemaVersion`, `reasoningSummary`, `assumptions`, `affectedEntities`, `before`, `after`, `validationErrors`, `warnings`, `requiresApproval`, `expiresAt`, and `idempotencyKey`. Treat model output as untrusted input. Revalidate server-side at execution time; never execute arbitrary code or raw SQL from model output.

## AI user experience

- Clearly label generated suggestions and show uncertainty.
- Ask one focused clarification when product/SKU/batch resolution is ambiguous.
- Explain what will change and which records will be touched.
- No silent mutation, auto-approval or one-click destructive actions.
- Provide “Edit proposal”, “Apply changes”, “Discard”, and “Why?” actions with distinct semantics.
- After apply, show persisted changes and link to affected batch/product/job.
- Keep normal manual workflows fully available; AI is optional, not required for core work.
- Add prompt injection resistance by treating product descriptions, uploaded content and user-provided text as data, not system instructions.
- Never send sensitive operator/customer/business information to an external model without explicit policy and disclosure.

## Action registry / shortcuts architecture
Every action should be registered once and reused by buttons, palette, contextual strip, keyboard, tour and automation. Shape:

`id`, `label`, `description`, `category`, `keywords`, `scope`, `defaultShortcut`, `isEnabled(context)`, `disabledReason(context)`, `requiresConfirmation`, `execute(context)`, `undo?`.

Do not pass stale closures. Context should be derived from the active route and selected entity at invocation time. Add telemetry/audit for consequential actions; never record secrets or full prompts by default.

## Acceptance criteria

- A rule-based helper is not presented as a live LLM integration.
- No model key appears in built client assets.
- Applying a proposal changes the intended persisted records and returns the resulting records.
- A proposal with invalid stock or missing SKU cannot be approved.
- Every proposal requires an explicit action; no automatic approval for production mutations.
- The same registered action is executed by button, command palette and shortcut.
