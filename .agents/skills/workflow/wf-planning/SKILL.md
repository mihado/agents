---
name: wf-planning
description: Owns execution-plan production and adversarial plan pressure-testing. Use with execution or adversarial mode after a settled Brief.
---

# Workflow Planning

## Mode selection

- **execution:** turn a settled Brief into an evidence-grounded `plan.md` handoff.
- **adversarial:** independently pressure-test a proposed execution route, unit shape, safeguards, and evidence. Do not write `plan.md`.

The conductor selects the mode. Both modes stay read-only and return unresolved semantics, security, data, or operational decisions to Think.

## Execution mode

### Process

1. Inspect relevant code, tests, configuration, and official documentation before making factual claims.
2. Map every Brief acceptance criterion to a narrow tracer-bullet unit and direct evidence. For behavior-bearing code, name the lowest adequate evidence level: unit, integration, browser/runtime, or operational.
3. Define touchpoints, happy path, likely failure modes, safeguards, and escalation conditions without pre-writing implementation code.
4. Return unsettled design, user-semantic, security, data, or operational decisions to Think or research as appropriate. Do not replace an unsettled decision with a tracer, spike, compatibility test, or later gate inside an execution Plan when its result determines the approved route, deployment topology, external integration, public contract, safety boundary, or acceptance evidence. A unit whose evidence strategy is “determine whether X works” is research, not implementation, when X determines the route.

Completion criterion: every acceptance criterion maps to a bounded unit with a direct evidence target; every unit names scope, dependency, failure behavior, safeguards, and an escalation condition. A Plan is implementation-ready only when its Brief is settled, its applicable research decisions are explicitly adopted in that Brief, and no unit defers a route-determining decision.

### Eligible practice skills

Select and record only methods with a concrete trigger:

- `api-and-interface-design` for a public API or module interface contract.
- `domain-modeling` for vocabulary, ownership, or boundary changes.
- `security-and-hardening` for untrusted input, auth, storage, tenant boundaries, or third-party integration.
- `deprecation-and-migration` for removal, user migration, or schema/data migration.
- `ci-cd-and-automation` for build, deployment, quality-gate, or CI pipeline changes.
- `frontend-ui-engineering`, `hallmark`, or `impeccable` for settled UI work.

### Execution-unit contract

Every unit must declare:

```md
### U<N>: <unit name>
**Files / target scope:** <paths, records, service, or environment>
**Depends on:** <none or prior units>
**Execution mode:** code | ui | configuration | operation | migration | documentation
**What to change:** <concrete bounded scope>
**Happy path:** <observable route from input or trigger to accepted outcome>
**Likely failure modes:** <validation, dependency, state, rollback, or user-facing failure behavior; `not applicable` only when true>
**Design context:** <settled interaction, visual, product, or operational decisions; `not applicable` only when true>
**Evidence strategy:** <test-first | characterization | static | browser/runtime | operational | manual>
**Evidence target:** <test, command, browser flow, pre/post measure, or human disposition; for behavior-bearing code, state the lowest adequate level: unit | integration | browser/runtime | operational>
**No-test exception:** <why automated testing is unsuitable; `none` when test-first/characterization applies>
**Operational safeguards:** <dry run, idempotency, rollback/recovery, and stop conditions; `not applicable` only when true>
**Suggested supporting skills:** <triggered skills likely useful to the operator; `none` only when true>
**Escalate when:** <discovery that would change outcome, route, acceptance, non-functional commitment, safety boundary, or required evidence>
**Verification:** <focused and final checks>
```

Use this closed execution-mode vocabulary:

- **code:** behavior-changing implementation. Use test-first evidence where feasible; otherwise state a characterization or no-test exception. Name the lowest adequate level: unit for isolated logic, integration for a crossed boundary, browser/runtime for a critical user flow, or operational for a real system boundary.
- **ui:** implementation against settled design context. Browser/runtime evidence covers relevant flow, state, keyboard access, and responsive constraints when tooling exists.
- **configuration:** policy, manifest, or integration configuration. Use static validation plus a fresh-load behavioral check when it changes active workflow behavior.
- **operation:** bounded approved runbook work. Require target scope, preconditions, dry run where available, idempotency, recovery, and stop conditions.
- **migration:** data or schema operation. Require operation safeguards plus pre/post state evidence and rollback or explicit irreversibility.
- **documentation:** static content with build/link/lint or explicit human semantic review.

If design context, user semantics, security boundaries, data shape, external side effects, or operational safeguards are unsettled, return the unit to Think or research as appropriate. The Plan suggests methods; it is not an exhaustive implementation recipe.

### Output format

```md
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: plan
artifact_id: plan-<n>
upstream_artifacts:
  - <artifact-id>
observed_target: <target>
created_at: <ISO-8601 timestamp>
brief_id: brief-<n>
readiness: implementation-ready
---

## Goal
<one-paragraph restatement of what this plan will accomplish>

## Implementation Units

### U1: <unit name>
<execution-unit contract>

## Patterns to follow
- <existing pattern> in <file:line>

## Verification Checklist
- [ ] <typecheck/lint/test/runtime check>

## Escalation Notes
- <why extra implementation or review rigor may be needed>
```

## Adversarial mode

### Mandate

1. Independently inspect the Brief and relevant repository evidence.
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
- <unit> — <missing or unsafe execution mode, design context, evidence strategy, no-test exception, or operational safeguard>

## Assumptions to verify
- <assumption>

## What's missing
- <gap> — <why it matters>
```

If no significant issue exists, say `No adversarial concerns found` and explain why briefly.
