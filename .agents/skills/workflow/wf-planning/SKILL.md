---
name: wf-planning
description: Produces a complete candidate Plan from one conductor-selected composite profile set and revises a selected base with bounded grafts after a settled Brief.
---

# Workflow Planning

## Modes

- **candidate:** produce one complete candidate Plan through the declared composite profile set. Load [`references/panels.md`](references/panels.md) and every profile reference it declares.
- **graft:** revise the selected base candidate with only the judge-cited decisions from declared candidates.

The conductor selects the mode and supplies a closed input set.

## Candidate mode

1. Inspect available code, tests, configuration, and official documentation before factual claims. Read only declared project artifacts. Resolve repository evidence only under the declared `repository_root`.
2. Load every profile reference in the declared profile set. Trace the affected flow before selecting the route.
3. Plan the next bounded vertical slice: one observable increment, one focused Operator invocation, direct evidence, and a healthy repository.
4. Map every Brief acceptance criterion exactly once as `advanced`, `out-of-slice`, `already-met`, or `cumulative-only`.
5. Select the first sufficient route: existing behavior, existing local mechanism, standard library/native platform, installed dependency, small local edit, then the smallest new owner or abstraction with a present unique obligation.
6. Name touchpoints, happy path, failures, safeguards, escalation, and the lowest adequate proof. For every value crossing a package boundary, name its producer, minimal public signature, consumer, and declaration-boundary proof. Keep implementation types and assembly details private. Return an escalation boundary for every unresolved route-determining decision.

Completion criterion: the candidate covers every material decision its profile claims to cover; each unit has scope, dependency, failure behavior, safeguard, escalation, and falsifiable evidence; every package-crossing value has a minimal public seam and declaration-boundary proof; its minimum route leaves no speculative structure.

### Minimum evidence

Plan one test only when it proves behavior the change could regress and existing evidence does not already prove it. Choose the lowest adequate level: unit for isolated logic, integration for a crossed boundary, or runtime for a critical user path. Static wiring already covered by typecheck or lint and duplicate happy paths need no test plan.

### Candidate output

Load [references/unit-contract.md](references/unit-contract.md) for unit vocabulary.

```md
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: plan-candidate
artifact_id: <candidate-key>-run-<n>-candidate-<n>
upstream_artifacts:
  - <brief-id>
observed_target: <target>
created_at: <ISO-8601 timestamp>
brief_id: brief-<n>
candidate_key: <descriptive-kebab-case>
planning_run: run-<n>
planner_profile: <profile combination, or `general`>
revision: <integer, starting at 1>
revised_at: <ISO-8601 timestamp>
revision_summary: <initial candidate, or concise change>
---

## Slice Outcome
<observable result>

## Brief Coverage
- AC1: advanced — expected evidence: <evidence>

## Minimum Route
- Chosen route: <first sufficient route and concrete decision home>
- Reuse: <existing owner/pattern/platform behavior, or `none — new capability`>
- Extension threshold: <observable condition requiring more structure, or `none — no credible next rung`>

## Public Seams
- <producer> → <consumer>: `<minimal plain signature>`; proof: <declaration-boundary check>

## Implementation Units
### U1: <unit name>
<execution-unit contract>

## Patterns and Foundations
- Existing workspace pattern: <file:line, or `none — greenfield workspace`>
- Settled foundation: <Brief decision or authoritative source>

## Verification Checklist
- [ ] <typecheck/lint/test/runtime check>

## Escalation Notes
- <route-determining uncertainty, or `none`>
```

**Candidate authority:** a candidate is complete enough to compare, but cannot authorize implementation or verification. It must use a descriptive `candidate_key`, state its profile, and keep every new file, export, dependency, fixture, and test tied to a unique present obligation.

## Graft mode

Read only the declared Brief, selected base candidate or governing draft, judge disposition, cited candidate evidence, and any failed structural-readiness checklist items. Preserve the selected route and every prior graft unless a newly cited graft proves they cannot satisfy a Brief constraint, safeguard, or required proof. Adopt only decisions identified by candidate and section; do not form a new route from uncited ideas. A supplied checklist failure authorizes only the smallest repair needed to satisfy that item; it cannot alter the selected route or reopen candidate decisions.

Completion criterion: the draft realizes every cited graft, retains the base's unchallenged decisions, and leaves the operator no material route, boundary, invariant, safety, or proof decision to invent.

Return the candidate format with `artifact_role: plan-draft`, `artifact_id: draft-<candidate-key>`, `upstream_artifacts` listing the Brief, selected candidates, and judge disposition, plus `readiness: draft`, `revision`, `revised_at`, and `revision_summary`.
