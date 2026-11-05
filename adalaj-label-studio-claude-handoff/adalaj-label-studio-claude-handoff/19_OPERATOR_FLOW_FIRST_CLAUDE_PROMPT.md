# 19 — Operator-Flow-First Claude Code Prompt

Paste this prompt into Claude Code before making broad UI changes.

---

You are working on the real Adalaj Print Lab repository. Read all Markdown files in this handoff, especially:

- `00_MASTER_INDEX_AND_HOW_TO_USE.md`
- `02_PRODUCT_BLUEPRINT_AND_OPERATOR_WORKFLOWS.md`
- `15_CLAUDE_CODE_MASTER_INSTRUCTIONS.md`
- `16_CLAUDE_CODE_BATCH_PROMPTS.md`
- `17_DEFECT_TRACEABILITY_MATRIX.md`
- `18_CROSS_PAGE_WORKFLOW_LOGIC_AND_UX_AUDIT.md`

## Non-negotiable approach

Do not start by changing colors, cards, typography or spacing. First establish what a real operator is doing, which business object they are acting on, what state it is in, and what each action changes. The application must behave as one connected production workflow.

### Phase 1 — Reverse-engineer the current behavior

1. Run baseline install, typecheck, build and existing tests. Record output honestly.
2. Inventory every route, control, modal, menu, drawer, dropdown, canvas inspector, shortcut, table action and keyboard event.
3. Draw state/data flow for Product, SKU, Batch, Allocation, Template, Machine, PrintJob, PrintAttempt, Proof and Audit Event.
4. Trace each operator action across component props, callbacks, state setters, service functions and database mutations.
5. Find every stale, duplicate, local-only, implicit-default or array-index-based selection.
6. Verify all findings in the workflow audit against current source and update exact line references.
7. Produce a list of unresolved business rules; do not invent them.

### Phase 2 — Define canonical task context and business commands

Create one typed source of truth for current context, represented by stable IDs. Selecting a batch must derive its product; selecting an allocation must derive SKU/pack/template resolution; changing one parent selection must atomically reconcile dependent selections. Route changes must preserve intended context. No page may silently replace an explicit ID with the first array item.

Move business logic out of components into pure, tested domain functions and transactional commands. Components should render state and call commands; they should not each independently calculate batch counts, expiry dates, current template, MRP, or print readiness.

### Phase 3 — Repair workflows in risk order

1. Product and SKU integrity: canonical pack size, units, positive net weight, explicit MRP state, shelf-life inheritance and archive behavior.
2. Batch creation: unique IDs, correct product/SKU defaults, valid allocations, no over-allocation, explicit residual/waste policy, calendar date arithmetic.
3. Designer: exact SKU/pack scope, save confirmation, dirty-state protection, versioned templates and preview data binding.
4. Print handoff: selected batch/allocation IDs flow intact; template, pack profile, machine and values are resolved together.
5. Print lifecycle: immutable job snapshot, evidence-based proof, dispatch/acknowledgement, partial count/reject reconciliation and safe retry.
6. History: exact versus current-data reprint, immutable artifacts, accurate counts and correct batch duplication.
7. Settings/backup/AI: every setting must really affect what it says; every applied AI suggestion must execute and verify; backups must roundtrip all tables.

### Phase 4 — Rebuild UX around the real task

Only after task semantics are defined, improve the information architecture and UI. Every page should answer:

- What work object am I acting on?
- What is its current state?
- What is the next safe action?
- What will change if I press this button?
- What must be fixed before proceeding?
- How do I recover if it fails?

Use progressive disclosure: the ordinary operator sees the common safe workflow; advanced geometry/hardware diagnostics remain available but do not dominate routine work. Never hide important production warnings in a generic toast. Use explicit confirmations only for consequential or irreversible actions, not for every click.

### Phase 5 — Tests and release gate

Implement the mandatory E2E scenarios in `18_CROSS_PAGE_WORKFLOW_LOGIC_AND_UX_AUDIT.md`. Include keyboard-only and responsive interaction checks. Test actual printer protocols only with the documented physical devices. Do not label a workflow “complete” because a button callback ran. Require persisted state and observable evidence.

## Deliverables

Before broad implementation, return:

1. Workflow maps and entity state diagrams.
2. One master interaction/control inventory.
3. Confirmed/contradicted defect list with exact source references.
4. Proposed canonical state and domain command contracts.
5. Business-rule questions that require the product owner.
6. Ordered implementation plan with acceptance tests.

Then implement one focused batch at a time, run relevant tests, update the traceability matrix, and keep the app runnable. Preserve useful current functionality and data; do not replace it with a generic demo.
