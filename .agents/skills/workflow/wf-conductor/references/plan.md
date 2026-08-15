# Plan

Execution planning for the next bounded vertical slice.

## Prerequisites

Resolve `.agent-contexts/active.md` and read the active Brief. If no active work exists but the request is settled, follow the bootstrap procedure in [references/think.md](think.md) (create work directory, write Brief, publish `active.md`) before proceeding. If no Brief exists, return to Think.

## Eligibility

Execution planning is eligible when:
- The Brief has a settled outcome, acceptance criteria, hard constraints, decision owner, and required safety/non-functional commitments.
- Remaining unknowns are confined to implementation mechanics (local API shape, naming, file layout, test-harness specifics) that cannot change the approved route, deployment topology, external integration, or acceptance evidence.

If a bounded factual question blocks route selection, invoke `wf-research`. Persist evidence under the active work. Resume Plan when the evidence remains within Brief authority; return to Think when it changes outcome, ACs, hard constraints, or settled decisions.

## Rigor selection

Apply elevation before standard:

1. **Elevated execution** when an elevation predicate applies: broad/cross-system touchpoints, auth/security, data-model changes, concurrency/orchestration risk, or unclear verification.
2. **Standard execution** when no elevation predicate applies.

## Dispatch

### Standard execution (single planner)

Dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`. Write the result directly as the Plan.

### Elevated execution (revision loop)

1. Dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`. The planner returns a draft Plan.
2. Dispatch `planner-adversarial` with `Required skill: wf-planning`, `Mode: adversarial`, supplying the draft Plan.
3. Dispatch `judge` with `Required skill: wf-judge`, supplying the draft Plan and adversarial critique marked `[PLAN ADJUDICATION]`.
4. **Route on disposition:**
   - `replan-required`: stop. Return the adjudicated findings to Think or Research.
   - `no-actionable-findings`: proceed to final check (step 5) with the original Plan.
   - `revise-plan`: dispatch `planner` again with the original Brief, draft Plan, and adjudicated findings. Proceed to final check (step 5) with the revised Plan.
5. **Final adversarial check:** dispatch `planner-adversarial` with the candidate Plan marked `[FINAL GATE]`. Persist only on `no-actionable-concerns`. On `actionable-concerns`, escalate to the user.

One revision round maximum. The final adversarial check is a binary acceptance gate.

Use only configured named workers. If a required named worker or `judge` is unavailable, stop as `BLOCKED` and name the unavailable binding.

## Persistence (slice Plan)

Each Plan is the implementation-ready contract for one bounded vertical slice, not the complete objective. Write to `.agent-contexts/work/<work-id>/plans/plan-<n>.md`. Must include the active Brief identity, upstream artifacts, observed target, `artifact_role: plan`, and exactly `readiness: implementation-ready`.

**Successor lineage gate:** For `plan-02` onward as a *new slice* (not a replacement), `upstream_artifacts` must include:
- The prior slice Plan ID (e.g. `plan-01`)
- The prior slice's accepted Verify artifact ID (with `PASS` verdict)
- The prior slice's accepted Review artifact ID (with `no-actionable-findings` disposition)

The conductor validates this lineage before publishing. A successor Plan without accepted predecessor evidence is `BLOCKED — lineage gate`.

**Superseding replacement gate:** When an existing Plan needs semantic correction (defective, stale, failed, or invalidated by new evidence), write a replacement Plan with:
- `supersedes: plan-<prev>`
- `supersession_reason: <what changed>`
- `upstream_artifacts` includes the replaced Plan ID and the evidence or mismatch that motivated replacement

A superseding Plan does *not* require accepted predecessor PASS/Review. It resets the execution contract.

**Publishing:** Update `active.md` only after the Plan passes its applicable gate. Reset `latest_attempt` to `null` on any new Plan.

Successive slice Plans are sequential contracts. Use `supersedes` only to replace a defective or obsolete Plan.

All artifacts include `wf-artifact/v1` metadata.

## Post-slice routing

After a successful slice (accepted Operator → Verify → Review), the conductor compares slice evidence with the Brief:

- **Work remains:** plan the next slice from the current repository state and accepted evidence. Return to Plan dispatch.
- **Route, acceptance, or safety boundary changed:** return to Research or Think.
- **All Brief AC IDs covered:** run final Brief-wide Verify and Review (see [references/act.md](act.md)).

## Completion format

```md
## Plan Complete
- Plan written to `.agent-contexts/work/<work-id>/plans/plan-<n>.md`
- `active.md` updated
- Next: run `/act` or inspect the plan
```
