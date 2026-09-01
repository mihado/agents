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

1. Inspect available code, tests, configuration, and official documentation before factual claims — including the repository's own architecture documentation and ADRs, not only external framework/library docs. Read only declared project artifacts. Resolve repository evidence only under the declared `repository_root`.
2. Load every profile reference in the declared profile set. Trace the affected flow before selecting the route.
3. Plan the next bounded vertical slice: one observable increment, one focused Operator invocation, direct evidence, and a healthy repository. Record the current behavior, settled decisions, affected callers/files, failure policy, and exclusions that let the operator act without re-deciding the route.
4. Map every Brief acceptance criterion exactly once as `advanced`, `out-of-slice`, `already-met`, or `cumulative-only`.
5. Select the first sufficient route: existing behavior, existing local mechanism, standard library/native platform, installed dependency, small local edit, then the smallest new owner or abstraction with a present unique obligation. Reuse an established repository pattern first; if none fits, use a reputable public pattern and cite it. A novel architecture is unresolved until its owner approves it.
6. Name touchpoints, happy path, failures, safeguards, escalation, and the lowest adequate proof. For every package-crossing value, trace its direct consumer and the existing composition path before choosing a seam. Reuse the narrowest project-native seam: a server-only composition subpath may accept concrete runtime types already used by its direct consumer only when declaration-boundary proof shows the subpath is absent from shared/browser exports and reachable only from the server composition graph; use a plain port only when it prevents a real policy or consumer-boundary leak. Name producer, consumer, lifecycle owner, signature, and declaration-boundary proof. Return an escalation boundary only for an unresolved decision that can change outcome, ownership, route, safety, or proof.

Completion criterion: the candidate covers every material decision its profile claims to cover; each unit has scope, dependency, failure behavior, safeguard, escalation, and falsifiable evidence; every package-crossing value has a project-native seam and declaration-boundary proof; its minimum route leaves no speculative structure.

### Minimum evidence

Plan one test only when it proves behavior the change could regress and existing evidence does not already prove it. Choose the lowest adequate level: unit for isolated logic, integration for a crossed boundary, or runtime for a critical user path. Static wiring already covered by typecheck or lint and duplicate happy paths need no test plan.

### Composition

Before a unit introduces or grows a domain's primary persistence or business-logic home, check the repository's own governing architecture documentation for that area (an architecture doc, ADRs — the repo-owned reading step 1 now names, distinct from external framework/library docs).

- **Governed** — the documentation already covers this area: adhere to it, and record the citation (`file:line`) as the unit's existing workspace pattern. If satisfying the Brief would erode the documented pattern, or repository evidence surfaces a concrete improvement to it, that is a blocker — name it rather than silently comply or silently deviate.
- **Frontier** — the documentation is silent on this area: this is the novel-architecture case step 5 already names, unresolved until its owner approves it. Once resolved, propose the decision back into the governing documentation so the next candidate here finds it governed, not a frontier again.

Below that check, treat a local factory, type choice, or non-domain package seam as implementation mechanics — reuse it, cite it, and do not turn it into an architecture stop.

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
brief_revision: <active Brief revision, or `0` when omitted>
candidate_key: <descriptive-kebab-case>
planning_run: run-<n>
planner_profile: <profile combination, or `general`>
revision: <integer, starting at 1>
revised_at: <ISO-8601 timestamp>
revision_summary: <initial candidate, or concise change>
---

## Slice Outcome
<observable result>

## Context
- Current behavior: <what is missing or wrong, with repository evidence>
- Existing path: <entry point → affected owner → observable outcome, with file:line references>
- Why this slice: <why this is the smallest useful increment>

## Settled Decisions
- <decision> — <repository evidence, Brief decision, or cited public pattern>

## Compatibility Context
- <development-only | shared-applied | released>: <data, migration, encryption format, or caller state that must be preserved; omit when no compatibility boundary changes>

## Brief Coverage
- AC1: advanced — expected evidence: <evidence>

## Minimum Route
- Chosen route: <first sufficient route and concrete decision home>
- Reuse: <existing owner/pattern/platform behavior, or `none — new capability`>
- Extension threshold: <observable condition requiring more structure, or `none — no credible next rung`>

## Public Seams
- <producer> → <consumer> (lifecycle: <owner>): `<narrowest project-native signature>`; proof: <server-only subpath absent from shared/browser exports and reachable only from server composition, or other declaration-boundary check>; rationale: <existing composition pattern, or boundary leak prevented>

## Change Map
- `<path>`: <concrete responsibility changed; existing pattern or caller reference>

## Implementation Units
### U1: <unit name>
<execution-unit contract>

## Patterns and Foundations
- Existing workspace pattern: <file:line into the governing architecture doc/ADR (Governed); the frontier resolution and where it was written back (Frontier); or `none — greenfield workspace` when the repository itself has no code yet>
- Settled foundation: <Brief decision or authoritative source>

## Verification Checklist
- [ ] <typecheck/lint/test/runtime check>

## Escalation Notes
- <route-determining uncertainty, or `none`>

## Risks
- <material pre-existing or introduced risk, consequence, and why it is in or out of this slice; `none`>

## Out of Scope
- <excluded work, or `none`>
```

**Candidate authority:** a candidate is complete enough to compare, but cannot authorize implementation or verification alone. A published Plan authorizes execution through its pinned candidate revision. It is a complete proposed Plan, never a summary or outline. Its Context, Settled Decisions, Change Map, Risks, and Out of Scope sections resolve the operator's route rather than restating repository code. When encryption, schema/data history, public contracts, rollout, or migration files change, Compatibility Context states whether the affected state is `development-only`, `shared-applied`, or `released`, with supporting evidence. It must use a descriptive `candidate_key` for the observable slice, not its current terminology; state its profile; and keep every new file, export, dependency, fixture, and test tied to a unique present obligation. A new port, adapter, or factory needs a present boundary obligation; framework types in a deliberately narrow server-only composition seam are not alone a reason to add one. The conductor confirms key reuse against the existing slice outcome before persistence.

## Graft mode

Read only the declared Brief, selected base candidate or governing draft, judge disposition, cited candidate evidence, and any failed structural-readiness checklist items. Preserve the selected route and every prior graft unless a newly cited graft proves they cannot satisfy a Brief constraint, safeguard, or required proof. Adopt only decisions identified by candidate and section; do not form a new route from uncited ideas. A supplied checklist failure authorizes only the smallest repair needed to satisfy that item; it cannot alter the selected route or reopen candidate decisions.

Completion criterion: the draft realizes every cited graft, retains the base's unchallenged decisions, and leaves the operator no material route, boundary, invariant, safety, or proof decision to invent.

Return a complete candidate with the cited grafts applied; the planner never persists it and never copies a candidate into a draft.
