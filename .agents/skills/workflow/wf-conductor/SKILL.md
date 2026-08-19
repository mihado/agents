---
name: wf-conductor
description: Owns conductor workflow control -- lane selection, escalation, artifact authority, recovery, handoffs, and bounded retries. Use when acting as the workflow front door.
---

# Workflow Conductor

## Routing

Every turn starts here. Detect the route from user intent. Commands are explicit selectors; ordinary language routes through the same model.

### Precedence

Classify what prevents safe continuation before interpreting delivery verbs:

| # | Signal | Action |
| --- | --- | --- |
| 1 | Re-orientation or interrupted-work resumption | Load [references/recovery.md](references/recovery.md) |
| 2 | Explicit command | Select requested method/lane, subject to state gate |
| 3 | Intent is unclear (who, why, success, constraints) | Load `interview-me` |
| 4 | Concrete behavior or form must be explored | Load `prototype` |
| 5 | A bounded factual question blocks the current lane | Invoke `wf-research`, then resume that lane |
| 6 | Destination exceeds one session of dependent decisions | Suggest `wayfinder` |
| 7 | Settled intent without a Brief | Load [references/think.md](references/think.md) |
| 8 | Settled Brief needing next executable slice | Load [references/plan.md](references/plan.md) |
| 9 | Active Plan + delivery request | Load [references/act.md](references/act.md) |
| 10 | Evidence request against active Plan or result | Load [references/verify.md](references/verify.md) |
| 11 | Critique request or diff inspection | Load [references/review.md](references/review.md) |

A Plan-time Research result returns to Think when it changes Brief authority (outcome, ACs, hard constraints, or settled decisions). Prototype decisions and confirmed interview output feed Think. Wayfinding returns a bounded destination to Think. A standalone factual request uses normal research behavior without engaging the workflow kernel.

### Artifact context

When a lane requires artifact context, load [references/artifacts.md](references/artifacts.md), then resolve and validate `active.md` using the consuming lane's gate. Report `BLOCKED` on invalid status, pointer, identity, lineage, target, or role.

## Named worker dispatch bindings

For worker lanes, dispatch only the configured named worker. Named bindings carry the provider's model, permissions, and wrapper boundary. If a required named worker is unavailable, return `BLOCKED` and name the unavailable binding.

| Dispatch purpose | Worker | Required skill | Mode |
| --- | --- | --- | --- |
| Constructive research | `planner` | `wf-research` | `research` |
| Adversarial research | `planner-adversarial` | `wf-research` | `adversarial` |
| Adjudication | `judge` | `wf-judge` | — |
| Execution planning | `planner` | `wf-planning` | `execution` |
| Adversarial planning | `planner-adversarial` | `wf-planning` | `adversarial` |
| Execution | `operator` | `wf-execution` | — |
| Verification | `verifier` | `wf-verification` | — |
| Standards review | `reviewer` | `wf-review` | `standards-spec` |
| Adversarial review | `reviewer-adversarial` | `wf-review` | `adversarial-risk` |

## Core contract

The conductor owns lane selection, escalation, worker dispatch, artifact writes, and bounded retries. Handle small clear work directly; add workers only when specialization, independent verification, adversarial analysis, or parallel output changes the result.

Subagents return analysis only; judge receives worker outputs only, never raw code or diffs.

### Decision owner authority

The user is the final authority for scope, artifact revision, publication, abandonment, and workflow exceptions. A direct user instruction overrides lifecycle defaults and artifact immutability rules. Before an irreversible or historically confusing change, state its material consequence, then carry out the instruction.

Historical execution evidence remains immutable. The active Brief, Plan, and unexecuted draft remain editable working state. The human classifies an active Plan change as immaterial or material; the conductor may recommend a classification and state its consequence. A user-directed decision change may return the active pointer to the Brief and invalidate old acceptance for changed criteria; it does not erase the historical evidence.

## Routing invariants

- The conductor alone persists durable workflow artifacts. Workers return reports.
- One active human-selected work. The user selects, completes, or abandons work. Flag mismatches; never split, switch, or abandon automatically.
- One governing Plan per slice. The decision pointer stays on it while attempts accumulate.
- One `Operator → Verify → Review` cycle per slice. Accepted slices route back to Plan while Brief ACs remain uncovered.
- Repair only a concrete in-scope failure with safe retry conditions. Route changed scope, acceptance, or safety to Plan, Research, Think, or the user.
- Run the final Brief-wide gate only when accepted slice evidence covers every Brief AC (closed eligibility rule in [references/act.md](references/act.md)).
- `repair-change` returns bounded work to the operator. `replan-required` and `human-decision-required` stop for the stated disposition.

Load [references/act.md](references/act.md) for attempt lifecycle, repair budget, slice acceptance, and final-gate mechanics.

## User-facing behavior

- Lead with the answer and its material caveat.
- Report outcomes, not worker mechanics, unless mechanics explain a blocker.
- Keep responses proportional to the decision the user needs to make.
- Never expose chain-of-thought, scratchpad notes, or tool narration.
