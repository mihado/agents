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

### Focused-draft stewardship

`@<candidate-key>.draft.md` focuses one draft for the current conversation. It is conversational context only — it never changes `active.md`. While focused, the conductor re-reads the current revision before revising, reviewing, marking ready, or publishing it.

For batch planning requests, the conductor reviews all active-Brief drafts, makes safe in-authority revisions, runs readiness gates, and marks eligible drafts ready. It does not publish a Plan unless the user expresses publication intent. Return only decisions requiring human authority, including which ready slice to publish when multiple candidates remain.

Unless the user explicitly requests publication, complete this lane after persisting the draft and report the draft-only completion format below.

### Standard execution (single planner)

Dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`. Persist the result as a draft before presenting it. Run the standard readiness gate against the persisted revision; if it passes, set `readiness: ready` with the gate record.

### Elevated execution (revision loop)

1. Dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`. Persist the returned candidate as a draft Plan before review.
2. Dispatch `planner-adversarial` with `Required skill: wf-planning`, `Mode: adversarial`, supplying the persisted draft Plan.
3. Dispatch `judge` with `Required skill: wf-judge`, supplying the draft Plan and adversarial critique marked `[PLAN ADJUDICATION]`.
4. **Route on disposition:**
   - `replan-required`: stop. Return the adjudicated findings to Think or Research.
   - `no-actionable-findings`: proceed to final check (step 5) with the original Plan.
   - `revise-plan`: dispatch `planner` again with the original Brief, draft Plan, and adjudicated findings. Persist the revision in place on the same named draft (increment `revision`), then proceed to final check (step 5).
5. **Final adversarial check:** dispatch `planner-adversarial` with the persisted candidate marked `[FINAL GATE]`. On `no-actionable-concerns`, set `readiness: ready` with `readiness_gate: elevated-final-adversarial` and `readiness_evidence` containing `{ gate: "standard-validation", result: "passed" }` and the final adversarial report path. On `actionable-concerns`, keep it `readiness: draft` and escalate to the user; explicit human approval may publish that resolved draft's current revision as `human-approved` with every accepted concern recorded.

One revision round maximum. The final adversarial check is a binary acceptance gate.

Use only configured named workers. If a required named worker or `judge` is unavailable, stop as `BLOCKED` and name the unavailable binding.

## Draft persistence

Every execution-planning request produces a durable review artifact at `.agent-contexts/work/<work-id>/plans/<candidate-key>.draft.md`, including candidates that later fail review. Create a new `candidate_key` only for a distinct candidate slice; revise an existing candidate in place.

Persist with `artifact_role: plan-draft`, the active `brief_id`, current observed target, `readiness: draft`, `revision`, `revised_at`, and a concise `revision_summary`. Increment `revision` on each update; replace the body with the current proposal.

Drafts are not recorded in `active.md`. Keep `current_artifact_path` unchanged.

### Revision conflict

Before revising, re-read the named draft and confirm its `revision`. If it differs from the expected value, stop:

```md
BLOCKED — draft revision conflict: expected revision <n>, found <m>.
Re-read the draft and re-plan, or ask the user which revision to proceed from.
```

Do not overwrite another planner's work. This is the same authority as a lineage-gate failure.

### Standard readiness gate

The standard gate (`readiness_gate: standard-validation`) is a closed checklist. Every item must hold for the current revision:

1. Valid draft envelope: `wf-artifact/v1` frontmatter, `artifact_role: plan-draft`, and `candidate_key` present.
2. `brief_id` matches the active Brief and the Brief is not `STALE`.
3. Every Brief AC represented exactly once with a closed status (`advanced`, `out-of-slice`, `already-met`, `cumulative-only`).
4. Every `advanced` AC has a named evidence expectation.
5. Every implementation unit names scope, dependency, failure behavior, safeguards, and an escalation condition.
6. Verification checklist is non-empty.
7. No unit defers a route-determining decision (route, topology, external integration, public contract, safety boundary, or acceptance evidence).
8. No material staleness: `observed_target` is reachable from the current worktree without unrelated drift.
9. Valid lineage: successor or supersession `upstream_artifacts` meet the applicable gate (see Publication below).

On pass, set `readiness: ready`, `readiness_revision` to the current `revision`, `readiness_gate: standard-validation`, `readiness_evidence` to `[{ gate: "standard-validation", result: "passed" }]` plus any persisted report paths consumed, and `ready_at`. On fail, remain `readiness: draft` and report the failing items.

Elevated planning uses the final adversarial check as its gate (`readiness_gate: elevated-final-adversarial`); the standard checklist is run as a precondition before adversarial review. On pass, `readiness_evidence` records both `{ gate: "standard-validation", result: "passed" }` and the final adversarial report path.

### Default completion

Unless the user explicitly requests publication, return:

```md
## Plan Draft Persisted
- Status: `<draft | ready>`; no Plan published.
- Draft: `<candidate-key>.draft.md` (revision <n>)
- Next: review this draft or explicitly ask to publish it.
```

## Publication (slice Plan)

Each Plan is the executable contract for one bounded vertical slice, not the complete objective. Write to `.agent-contexts/work/<work-id>/plans/plan-<n>.md`. It must include the active Brief identity, upstream artifacts, observed target, and `artifact_role: plan`.

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

**Publication resolution:** the conductor resolves the target draft by:

1. A draft explicitly named in the user's current request.
2. The focused `@` draft in the current conversation.
3. One unambiguous eligible (`readiness: ready`) draft for the active Brief.
4. A clarification prompt if more than one candidate remains plausible.

Clear intent — "implement this," "proceed with this plan," "make this the next slice" — publishes the resolved draft's current re-read revision.

Before writing either Plan, re-read the resolved draft and confirm it is the current revision, has a valid `plan-draft` envelope, and matches the active Brief.

Ordinary publication requires `readiness: ready`, `readiness_revision == revision`, the standard structural validity floor (valid AC references, complete unit structure, valid lineage, no material staleness), and writes `readiness: implementation-ready`.

Human-approved publication requires explicit human affirmation of the resolved current draft, an `approval` record, and an `execution_escalation_boundary`. It may publish an unready or incomplete draft as `readiness: human-approved`; it bypasses readiness, standard-gate completeness, adversarial review, and successor-lineage evidence. The operator returns `NEEDS_CONTEXT` when discovery crosses the escalation boundary.

```yaml
approval:
  approved_by: human
  approved_at: <ISO-8601 timestamp>
  unresolved_items:
    - <implementation detail to discover>
  accepted_concerns:
    - <adversarial concern accepted by the approver, or `none`>
  execution_escalation_boundary: <scope, acceptance, safety, contract, or evidence change that must return NEEDS_CONTEXT>
```

Both forms write `.agent-contexts/work/<work-id>/plans/plan-<n>.md` with `artifact_role: plan`, `source_draft_id`, and `source_draft_revision`. Update the source draft's `last_published_plan_id`, `last_published_at`, and set its `readiness: draft`. Update `active.md` and reset `latest_attempt` to `null`.

Successive slice Plans are sequential contracts. Use `supersedes` only to replace a defective or obsolete Plan.

All artifacts include `wf-artifact/v1` metadata.

## Post-slice routing

After a successful slice (accepted Operator → Verify → Review), the conductor compares slice evidence with the Brief:

- **Work remains:** plan the next slice from the current repository state and accepted evidence. Return to Plan dispatch.
- **Route, acceptance, or safety boundary changed:** return to Research or Think.
- **All Brief AC IDs covered:** run final Brief-wide Verify and Review (see [references/act.md](act.md)).

## Publication format

```md
## Plan Published
- Status: plan-<n> persisted at `.agent-contexts/work/<work-id>/plans/plan-<n>.md`; `active.md` updated.
- Next: run `/act` or inspect the plan.
```
