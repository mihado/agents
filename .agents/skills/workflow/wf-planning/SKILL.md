---
name: wf-planning
description: Owns execution-plan production and adversarial plan pressure-testing. Use with execution or adversarial mode after a settled Brief.
---

# Workflow Planning

## Mode selection

- **execution:** turn a settled Brief into an evidence-grounded draft execution plan.
- **adversarial:** independently pressure-test a proposed route, unit shape, safeguards, and evidence. Return a report only.

The conductor selects the mode.

## Execution mode

### Process

1. Inspect available code, tests, configuration, and official documentation before making factual claims. For an empty or greenfield workspace, record the absence of local evidence and ground the Plan in the settled Brief and authoritative sources. Work from the dispatch envelope: read the declared Brief or draft at its declared `workspace_root`-relative path; do not substitute another copy. Resolve repository evidence only under the declared `repository_root` and never search `$HOME`, `/`, or parent directories for project artifacts. Official documentation URLs, permitted network access, and installed executable/tool paths are unaffected.
2. Plan the next bounded vertical slice — one coherent increment that delivers observable behavior, fits one focused Operator invocation, has direct evidence, and leaves the repository healthy.
3. Map the slice to the Brief acceptance criteria it advances (`AC<n>` IDs). Mark unrelated criteria `out-of-slice`.
4. For a greenfield workspace, the first slice establishes the smallest runnable and verifiable skeleton (manifest, source/test layout, build/typecheck/lint/test commands, minimal entry point); later slices deliver vertical behavior against it.
5. Define touchpoints, happy path, failure modes, safeguards, and escalation conditions.
6. Return unsettled route-determining decisions to Think or research. A unit whose evidence strategy is "determine whether X works" is research when X determines the route, deployment topology, external integration, public contract, safety boundary, or acceptance evidence. If package manager, framework, runtime, or test tooling is unsettled, that is not an implementation detail — return to Think or research.

### Minimum change

Before planning code or tests, inspect the affected flow and choose the first sufficient option:

1. No change: existing behavior satisfies the acceptance criterion.
2. Existing local mechanism: extend or compose it.
3. Standard library or native platform feature.
4. Installed dependency.
5. One local expression or small edit.
6. Smallest new module or abstraction.

Every planned new file, exported symbol, dependency, test fixture, or test case names the acceptance criterion, failure mode, trust boundary, or regression risk it proves. Omit additions with no unique obligation.

### Minimum evidence

Plan one test only when it proves behavior the change could regress and existing evidence does not already prove it. Choose the lowest adequate level:

- Unit: isolated branch or pure transformation.
- Integration: crossed boundary, configuration, persistence, process lifecycle, or authorization.
- Runtime: critical user-visible path.

Type declarations, static wiring already covered by typecheck or lint, private implementation shape, duplicate happy paths, and documentation wording need no test plan. One test may cover several obligations when its failure identifies the broken behavior.

Completion criterion: the slice delivers one observable bounded behavior; every unit names scope, dependency, failure behavior, safeguards, and an escalation condition; the Brief Coverage section declares which AC IDs are advanced and what evidence proves them. A draft is ready for adversarial review when it has a settled Brief, adopted research decisions, and no unit deferring a route-determining decision. Record irreducible implementation uncertainty as an explicit unresolved item and escalation boundary; the human may publish that bounded Plan.

### Eligible practice skills

Select and record only methods with a concrete trigger:

- `api-and-interface-design` — public API or module interface contract.
- `domain-modeling` — vocabulary, ownership, or boundary changes.
- `security-and-hardening` — untrusted input, auth, storage, tenant boundaries, or third-party integration.
- `deprecation-and-migration` — removal, user migration, or schema/data migration.
- `ci-cd-and-automation` — build, deployment, quality-gate, or CI pipeline changes.
- `frontend-ui-engineering`, `hallmark`, or `impeccable` — settled UI work.

### Output format

For the execution-unit contract template and execution-mode vocabulary, load [references/unit-contract.md](references/unit-contract.md).

```md
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: plan-draft
artifact_id: draft-<candidate-key>
upstream_artifacts:
  - <brief-id>
observed_target: <target>
created_at: <ISO-8601 timestamp>
brief_id: brief-<n>
candidate_key: <descriptive-kebab-case>
readiness: draft
revision: <integer, starting at 1>
revised_at: <ISO-8601 timestamp>
revision_summary: <initial draft, or concise description of the latest revision>
---

## Slice Outcome
<one paragraph describing the observable result delivered by this slice>

## Brief Coverage

- AC1: advanced — expected evidence: <evidence>
- AC2: out-of-slice
- AC3: advanced — expected evidence: <evidence>
- AC4: already-met — accepted verification: <verify artifact ID>
- AC5: cumulative-only

## Implementation Units

### U1: <unit name>
<execution-unit contract>

## Patterns and Foundations
- Existing workspace pattern: <file:line, or `none — greenfield workspace`>
- Settled foundation: <Brief decision or authoritative source>

## Verification Checklist
- [ ] <typecheck/lint/test/runtime check>

## Escalation Notes
- <why extra rigor may be needed>

## Directional Roadmap
- <likely next slice, or `none — this slice is expected to complete Brief coverage`>
```

**Brief Coverage rules:** enumerate every Brief AC exactly once using a closed status (`advanced`, `out-of-slice`, `already-met`, `cumulative-only`). Every AC ID must exist in the governing Brief.

**Draft authority:** return a `plan-draft` only. It is reviewable and recoverable, but does not authorize implementation or verification. Use a descriptive `candidate_key` (e.g. `agent-chat-foundation`) rather than a sequence number. The conductor persists it, applies the planning gate, and sets `readiness: ready` when it passes. The conductor resolves which draft to publish through intent-based resolution and writes a separate `plan-<n>` artifact.

**Draft revisions:** revisions update the same `candidate_key` in place and increment `revision`. Create a new draft ID only for a distinct candidate slice or alternative.

**Implementation Units:** ordered parts of the current slice executing in one Operator invocation. If a unit can be independently implemented and verified as observable behavior, it should be a separate slice Plan.

**Directional Roadmap:** orientation only. Does not authorize work, promise ordering, or establish verification obligations. The next slice is selected from current repository state and accepted evidence. May be omitted when the current slice is expected to complete the Brief.

## Adversarial mode

### Process

1. Independently inspect the Brief and relevant repository evidence. Read declared artifacts at their declared `workspace_root`-relative paths; resolve repository evidence only under the declared `repository_root`, never `$HOME`, `/`, or parent directories. Official documentation URLs, permitted network access, and installed executable/tool paths are unaffected.
2. Pressure-test route assumptions, tracer-bullet shape, and each unit's evidence and safeguards.
3. Surface edge cases, error paths, coupling, complexity creep, and regression risk.

Completion criterion: every credible route, unit-shape, evidence, or safeguard defect is cited, or explicitly assessed as holding.

### Output format

```md
## Failure modes
- <failure> — <why it matters>

## Tradeoffs
- <tradeoff> — <what's gained, what's lost>

## Hidden risk
- <risk> — <likelihood and impact>

## Slice-shape concerns
- <unit or area> — <why the slice is too horizontal, broad, or unverifiable>

## Execution-contract concerns
- <unit> — <missing or unsafe execution mode, design context, evidence strategy, or operational safeguard>

## Assumptions to verify
- <assumption>

## What's missing
- <gap> — <why it matters>
```

If no significant issue exists, say `No adversarial concerns found` and explain why briefly.

When used as a **final gate** in elevated planning (the conductor marks input `[FINAL GATE]`), end the report with an explicit disposition:

```md
## Gate: <no-actionable-concerns | actionable-concerns>
<one sentence naming the result>
```

The conductor changes the persisted draft to `readiness: ready` only on `no-actionable-concerns`.
