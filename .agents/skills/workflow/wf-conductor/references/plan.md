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

Every planner dispatch below is artifact-consuming: its dispatch envelope declares validated ordered inputs — the complete list of project artifacts the worker consumes — and every declared input is validated under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity) before dispatch.

### Focused-draft stewardship

`@<candidate-key>.draft.md` focuses one draft for the current conversation. It is conversational context only — it never changes `active.md`. While focused, the conductor re-reads the current revision before revising, reviewing, marking ready, or publishing it.

For batch planning requests, the conductor reviews all active-Brief drafts, makes safe in-authority revisions, runs readiness gates, and marks eligible drafts ready. It does not publish a Plan unless the user expresses publication intent. Return only decisions requiring human authority, including which ready slice to publish when multiple candidates remain.

Unless the user explicitly requests publication, complete this lane after persisting the draft and report the draft-only completion format below.

### Standard execution (single planner)

Dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`, and the dispatch envelope whose validated ordered declared inputs are the active Brief. Persist the result as a draft before presenting it. Run the standard readiness gate against the persisted revision; if it passes, set `readiness: ready` with the gate record.

### Elevated execution (adjudication and revision loop)

1. Dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`, and the dispatch envelope whose validated ordered declared inputs are the active Brief. Persist the returned candidate as a draft Plan before review. Immediately after persisting the initial draft, run the structural readiness gate as a precondition (it does not set `readiness: ready`). Only on a gate pass dispatch the initial planner-adversarial review (step 2). On a fail, keep the draft `readiness: draft`, report the failing items, and rework it with a planner revision (revision-loop operation, below); re-run the gate after each persisted rework, and do not dispatch the elevated review (steps 2–3) until the gate passes.
2. Dispatch `planner-adversarial` with `Required skill: wf-planning`, `Mode: adversarial`, and the dispatch envelope whose validated ordered declared inputs are the active Brief and the persisted draft Plan — the adversarial worker independently inspects the Brief alongside the draft. Persist the returned report to `plans/<candidate-key>.adversarial-<n>.md` with `artifact_role: plan-adversarial` (next `<n>` for that candidate) before dispatching the judge.
3. Dispatch `judge` with `Required skill: wf-judge` and the dispatch envelope whose closed declared inputs are the persisted draft Plan and the persisted adversarial report, marked `[PLAN ADJUDICATION]`. Persist the adjudication to `plans/<candidate-key>.adjudication-<n>.md` with `artifact_role: plan-adjudication`. The judge stays supplied-reports-only.
4. **Route on disposition:**
   - `replan-required`: classify each concern (see below). Route bounded factual or compatibility questions to Research and resume Plan; return to Think only when supported evidence changes Brief authority; stop only for a genuine user-owned decision.
   - `no-actionable-findings`: proceed to the final gate (step 5) with the current draft.
   - `revise-plan`: classify each concern (see below) and enter the revision loop (below), which routes the revision directly to the final gate (step 5) — never back to adjudication (step 3).
5. **Final adversarial check:** dispatch `planner-adversarial` with the persisted candidate marked `[FINAL GATE]` and the dispatch envelope whose validated ordered declared inputs are the active Brief and the persisted candidate draft Plan. Persist the returned report to the next `plan-adversarial` path before routing. On `no-actionable-concerns`, set `readiness: ready` with `readiness_gate: elevated-final-adversarial` and `readiness_evidence` containing `{ gate: "standard-validation", result: "passed" }` and the persisted final adversarial report path. On `actionable-concerns`, keep it `readiness: draft`, classify each concern, and feed the same revision loop, which returns the revision to this final gate; when a subsequent final check passes, set readiness as above. Explicit human approval may publish that resolved draft's current revision as `human-approved` with every accepted concern recorded.

### Revision loop (elevated planning)

Before each revision, classify every cited concern: `revise-plan` / `research` / `Think` / genuine user decision / `BLOCKED`. Route non-`revise-plan` concerns to their own lane instead of the planner.

- **Operation:** after classification leaves `revise-plan` concerns — or the structural readiness gate fails on the initial draft — confirm the cited concerns are concrete, then dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`, and the dispatch envelope whose validated ordered declared inputs are the current Brief, the current draft, and the relevant persisted adjudication or final-gate report paths. A structural readiness rework has no persisted report inputs; its declared inputs are the current Brief and the current draft, and its cited concerns are the failing checklist items. Persist the returned proposal as the next in-place revision, re-run the structural readiness gate after each persisted revision, and route on a pass: a revision reworking the initial readiness failure returns to the initial adversarial review (step 2); a revision following adjudication `revise-plan` or final-gate `actionable-concerns` routes directly to the final adversarial check (step 5) — never back to adjudication (step 3). On a readiness fail, keep the draft and rework it again within this loop.
- **Progress:** continue revisions automatically while each persisted revision makes evidence-backed progress on the concrete cited concerns: it resolves, narrows, or disproves them with evidence. A wording-only revision is no progress. Each elevated persisted draft revision extends its existing `revision_summary` with a compact progress record for every cited concern — the concern identifier or short statement, `concern_origin` (the persisted report path/ID plus finding identifier for the first report raising that concern), the route attempted, and the evidence-backed outcome (`resolved`, `narrowed`, `disproved`, or `no-progress`) — appending to the prior entries. A later report raising the same unresolved concern retains that `concern_origin` and records its current source path/ID alongside it. A structural readiness failure has no persisted report: each failing checklist item is a cited concern whose `concern_origin` combines the persisted draft artifact ID and revision of the first failing gate run with the checklist item number. Before each planner rework dispatch, append the normal progress record for every failing checklist item to the draft's existing `revision_summary` — that `concern_origin`, the current failing draft revision as its source, and the route the dispatch attempts — recording the evidence-backed outcome (including `no-progress` when a rework leaves the item failing unchanged) from the next gate run; a later failing gate run of the same checklist item retains that `concern_origin` and records its current revision alongside it, and repeated same-origin, same-route `no-progress` blocks under the circularity check below. The conductor matches a successor report concern to an existing origin by the exact finding identifier when the successor carries one, otherwise by the same normalized concern plus the same affected scope or acceptance criterion; an ambiguous match is `BLOCKED — planning loop` rather than a guess. `no-progress` records an attempted route that did not advance the cited concern; on the next same-origin, same-route comparison the conductor returns `BLOCKED — planning loop`. Dispatch failures do not count as revisions or progress.
- **Circularity check:** before dispatching another revision, compare the current cited concerns and the prior progress record against the immediately prior persisted revision. The loop is circular when the same concern remains materially unchanged, the proposed route repeats a prior failed route without new evidence, or evidence establishes a user-owned boundary change. The same `concern_origin` plus the same route with no recorded outcome progress is circular; a renamed or rephrased concern remains the same concern when it matches an existing `concern_origin` under the matching rule above, even though the citing report's path/ID differs. The accumulated progress record in `revision_summary` is the durable input for this stop.
- **Circular loop:** stop automatic planner revision. Route a user-owned boundary change through the user blocker classifier; otherwise return `BLOCKED — planning loop` naming the repeated concern or route and the supporting evidence. A circular-loop stop is a conductor decision, not a user question.
- **Final gate:** the final adversarial check feeds the same loop; `actionable-concerns` re-enters classification and revision while the loop continues.

Use only configured named workers. If a required named worker or `judge` is unavailable, stop as `BLOCKED` and name the unavailable binding. On `DISPATCH_FAILURE`, follow the dispatch-failure contract in [SKILL.md](../SKILL.md): persist the diagnostic, and retry once only because planning workers are read-only.

## Draft persistence

Every execution-planning request produces a durable review artifact at `.agent-contexts/work/<work-id>/plans/<candidate-key>.draft.md`, including candidates that later fail review. Create a new `candidate_key` only for a distinct candidate slice; revise an existing candidate in place.

Persist with `artifact_role: plan-draft`, the active `brief_id`, current observed target, `readiness: draft`, `revision`, `revised_at`, and a concise `revision_summary`. Increment `revision` on each update; replace the body with the current proposal. Elevated revision-loop revisions extend `revision_summary` with the per-concern progress record defined in the revision loop; ordinary drafts and lightweight revisions keep a concise `revision_summary`.

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

Elevated planning uses the final adversarial check as its gate (`readiness_gate: elevated-final-adversarial`); the standard checklist is run as a precondition before the initial adversarial review, after each persisted revision, and before the final gate. On pass, `readiness_evidence` records both `{ gate: "standard-validation", result: "passed" }` and the final adversarial report path.

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

A superseding Plan does *not* require accepted predecessor PASS/Review. It resets the execution contract, moves `active.md` to the successor Plan, and clears `latest_attempt`.

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

Both forms rename the resolved current draft to `.agent-contexts/work/<work-id>/plans/plan-<n>.md`, replace draft-only envelope fields with `artifact_role: plan`, `artifact_id: plan-<n>`, and the applicable Plan readiness, and retain its current `revision`, `revised_at`, and `revision_summary`. Update `active.md` and reset `latest_attempt` to `null`. Do not retain a duplicate source draft.

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
