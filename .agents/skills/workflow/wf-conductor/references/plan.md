# Plan

Execution planning for the next bounded vertical slice.

## Prerequisites

Resolve the absolute `<invocation_dir>/.agent-contexts/active.md` path and read the active Brief. If no active work exists but the request is settled, follow the bootstrap procedure in [references/think.md](think.md) (create work directory, write Brief, publish `active.md`) before proceeding. If no Brief exists, return to Think.

## Eligibility

Execution planning is eligible when:
- The Brief has a settled outcome, acceptance criteria, hard constraints, decision owner, and required safety/non-functional commitments.
- Remaining unknowns are confined to implementation mechanics (including a project-native package seam, local API shape, naming, file layout, and test-harness specifics) that cannot change the approved outcome, ownership, deployment topology, external integration, or acceptance evidence.

If a bounded factual question blocks route selection, invoke `wf-research`. Persist evidence under the active work. Resume Plan when the evidence remains within Brief authority; return to Think when it changes outcome, ACs, hard constraints, or settled decisions.

## Panel selection

Load [`wf-planning/references/panels.md`](../../wf-planning/references/panels.md). Select one composite profile set containing every concern that constrains the route, safeguard, or proof. One candidate is the default.

Add an independent candidate only when a competing route, an independent risk challenge, or a disagreement would materially change the selected Plan. The conductor assigns profile sets and panel size from observed risk; it does not choose the design. A combined profile set (for example, `api-interface + domain`) remains one candidate.

## Dispatch

Every planner dispatch below is artifact-consuming: its dispatch envelope declares validated ordered inputs — the complete list of project artifacts the worker consumes — and every declared input is validated under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity) before dispatch.

### Focused-draft stewardship

`@<candidate-key>.draft.md` focuses one draft for the current conversation. It is conversational context only — it never changes `active.md`. While focused, the conductor re-reads the current revision before revising, reviewing, marking ready, or publishing it.

For batch planning requests, the conductor reviews all active-Brief drafts, makes safe in-authority revisions, runs readiness gates, and marks eligible drafts ready. In `delivery_mode: autonomous`, publish and execute one unambiguous ready draft; return only a genuine user-owned decision or stop condition. In `delivery_mode: approval-required`, do not publish a Plan unless the user expresses publication intent; return only decisions requiring human authority, including which ready slice to publish when multiple candidates remain.

In `delivery_mode: approval-required`, complete this lane after persisting the draft unless the user explicitly requests publication. In `delivery_mode: autonomous`, publish and execute one unambiguous ready draft after its gate passes.

### Candidate panel and bounded graft

A graft's output is either **expand** — before selection, a new `candidate-<n+1>`/`adjudication-<n+1>` pair joins the still-open set — or **rework** — after selection, on a structural-readiness failure, the pinned candidate and its adjudication revise in place. Expand while comparing candidates; rework only the one candidate a draft already points to.

1. Reuse the `candidate_key` for the same proposed slice; names, terminology, and Brief changes do not create another key. Before reuse, confirm the existing key has the same observable outcome; on a different outcome, choose a distinct key. Default to reworking the current run in place across ordinary Brief revisions. Open a new `run-<n+1>` only when the active Brief ID changes, the slice's own observable outcome changes, or the prior run stopped; when one does supersede the current run, delete the superseded run's absolute `<invocation_dir>/.agent-contexts/work/<work-id>/planning/<candidate-key>/run-<n>/` directory once the new run's first candidate is persisted, and retarget the draft's `current_run` to it. Dispatch `planner` with `Required skill: wf-planning`, `Mode: candidate`, the active Brief, and the selected composite profile set. Before persistence, reject a summary or outline: the result must satisfy the candidate-completeness gate below. Persist it at the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/planning/<candidate-key>/run-<n>/candidate-<n>.md` path with `artifact_role: plan-candidate` before another worker consumes it. When panel selection requires an independent risk candidate, dispatch `planner-adversarial` with the same Brief and its declared risk profile set; dispatch other independent candidates only when a distinct competing route needs comparison.
2. Dispatch `judge` with `Required skill: wf-judge`, the closed persisted candidate set, and `[PLAN PANEL]`. Persist the disposition at the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/planning/<candidate-key>/run-<n>/adjudication-<n>.md` path with `artifact_role: plan-adjudication`.
3. **Route on disposition:**
   - `select`: write or retarget the governing draft to the selected candidate revision and adjudication, run the structural readiness gate against that pinned candidate, then set `readiness: ready` with `readiness_gate: panel-adjudication`.
   - `graft` (expand): dispatch `planner` with `Mode: graft`, the base candidate or current governing draft, the judge disposition, and only cited candidate evidence. Persist the returned complete candidate as a new candidate slot, expand and close the candidate set with it, then re-adjudicate that set as a new adjudication. Retarget the governing draft and run readiness only after the re-adjudication selects it.
   - `add-planner`: dispatch only the named profile, then re-run panel adjudication with the expanded set.
   - `replan-required`: classify the Brief-level defect under the user blocker classifier and route it to Research or Think.

The judge selects a base and cites existing candidate decisions. It never invents a hybrid route. A re-adjudication preserves the governing draft unless it identifies a cited defect or a missing planner; it cannot discard a completed graft for an earlier candidate.

### Revision loop (panel planning, rework)

This is the **rework** branch of graft (see above) — triggered only after selection, never before. Before each revision, classify every cited concern: `revise-plan` / `research` / `Think` / genuine user decision / `BLOCKED`. Route non-`revise-plan` concerns to their own lane instead of the planner.

- **Operation:** after a structural readiness failure, dispatch `planner` with `Mode: graft`, the current Brief, draft, adjudication, cited candidate evidence, and the failed checklist items. Revise the pinned candidate in place — increment `revision`, update `revised_at`/`revision_summary` — and re-run the structural gate. On pass, dispatch `judge` to re-confirm `select` against the reworked candidate, and revise the existing adjudication in place rather than persisting a new one. A readiness rework preserves the selected route and existing candidate decisions; it does not reopen the panel and never mints a new candidate or adjudication file.
- **Progress:** continue revisions automatically while each persisted revision makes evidence-backed progress on the concrete cited concerns: it resolves, narrows, or disproves them with evidence. A wording-only revision is no progress. Each elevated persisted draft revision extends its existing `revision_summary` with a compact progress record for every cited concern — the concern identifier or short statement, `concern_origin` (the persisted report path/ID plus finding identifier for the first report raising that concern), the route attempted, and the evidence-backed outcome (`resolved`, `narrowed`, `disproved`, or `no-progress`) — appending to the prior entries. A later report raising the same unresolved concern retains that `concern_origin` and records its current source path/ID alongside it. A structural readiness failure has no persisted report: each failing checklist item is a cited concern whose `concern_origin` combines the persisted draft artifact ID and revision of the first failing gate run with the checklist item number. Before each planner rework dispatch, append the normal progress record for every failing checklist item to the draft's existing `revision_summary` — that `concern_origin`, the current failing draft revision as its source, and the route the dispatch attempts — recording the evidence-backed outcome (including `no-progress` when a rework leaves the item failing unchanged) from the next gate run; a later failing gate run of the same checklist item retains that `concern_origin` and records its current revision alongside it, and repeated same-origin, same-route `no-progress` blocks under the circularity check below. The conductor matches a successor report concern to an existing origin by the exact finding identifier when the successor carries one, otherwise by the same normalized concern plus the same affected scope or acceptance criterion; an ambiguous match is `BLOCKED — planning loop` rather than a guess. `no-progress` records an attempted route that did not advance the cited concern; on the next same-origin, same-route comparison the conductor returns `BLOCKED — planning loop`. Dispatch failures do not count as revisions or progress.
- **Circularity check:** before dispatching another revision, compare the current cited concerns and the prior progress record against the immediately prior persisted revision. The loop is circular when the same concern remains materially unchanged, the proposed route repeats a prior failed route without new evidence, or evidence establishes a user-owned boundary change. The same `concern_origin` plus the same route with no recorded outcome progress is circular; a renamed or rephrased concern remains the same concern when it matches an existing `concern_origin` under the matching rule above, even though the citing report's path/ID differs. The accumulated progress record in `revision_summary` is the durable input for this stop.
- **Circular loop:** stop automatic planner revision. Route a user-owned boundary change through the user blocker classifier; otherwise return `BLOCKED — planning loop` naming the repeated concern or route and the supporting evidence. A circular-loop stop is a conductor decision, not a user question.

Use only configured named workers. If a required named worker or `judge` is unavailable, stop as `BLOCKED` and name the unavailable binding. On `DISPATCH_FAILURE`, follow the dispatch-failure contract in [SKILL.md](../SKILL.md): persist the diagnostic, and retry once only because planning workers are read-only.

## Candidate completeness

Before persisting a `plan-candidate`, verify it has a valid envelope pinned to the active Brief and its current revision; Context with repository evidence for the affected path; settled route decisions and their authority; one observable outcome; every Brief AC exactly once; a concrete minimum route; public seams when crossed; a Change Map covering every touched file or command; ordered units conforming to the complete execution-unit contract, including design decisions and affected callers/compatibility; Compatibility Context when encryption, schema/data history, public contracts, rollout, or migration files change; patterns/foundations; a non-empty exact verification checklist; material risks; and explicit out-of-scope work. On a failure, return the incomplete report to the planner once without creating a candidate artifact. A candidate that cannot pass is `BLOCKED — incomplete candidate`, not evidence for adjudication.

## Draft persistence

Every execution-planning request produces complete candidate papers under the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/planning/<candidate-key>/run-<n>/` path and a governing draft at the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/plans/<candidate-key>.draft.md` path. The draft pins one adjudicated candidate revision; it never copies the candidate body. `current_run` names the candidate_key's live run; rework revises that run's candidates or adjudication in place with `revision`, and their consumers pin the expected revision. Create a new `candidate_key` only for a distinct observable slice; revise its governing draft in place.

Persist with `artifact_role: plan-draft`, the active `brief_id`, current observed target, `current_run`, `governing_candidate` (candidate ID, path, and revision), `adjudication` (ID, path, and revision), `readiness: draft`, `revision`, `revised_at`, and a concise `revision_summary`. Increment `revision` when retargeting or recording a readiness repair. A newer candidate never changes a draft without adjudication.

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
3. `governing_candidate` and `adjudication` exist, their pinned identities/revisions match persisted artifacts, the candidate's `brief_id` and `brief_revision` match the active Brief, and the adjudication selects that candidate.
4. The pinned candidate represents every Brief AC exactly once with a closed status (`advanced`, `out-of-slice`, `already-met`, `cumulative-only`).
5. Every `advanced` AC has a named evidence expectation.
6. Every implementation unit in the pinned candidate conforms to the complete execution-unit contract, including design decisions and affected callers/compatibility.
7. Every package-crossing value names its producer, consumer, owning lifecycle, narrowest project-native seam, and declaration-boundary proof. A server-only composition seam may use the concrete runtime types already used by its direct consumer only when that proof shows the subpath is absent from shared/browser exports and reachable only from the server composition graph; introduce a plain port only when it prevents a real policy or consumer-boundary leak.
8. The pinned candidate's verification checklist is non-empty and declares every materially applicable configured command or its scope-based inapplicability.
9. No pinned unit defers a route-determining decision (route, topology, external integration, public contract, safety boundary, or acceptance evidence).
10. No material staleness: `observed_target` is reachable from the current worktree without unrelated drift.
11. Valid lineage: successor or supersession `upstream_artifacts` meet the applicable gate (see Publication below).

Panel planning uses adjudication as its gate (`readiness_gate: panel-adjudication`). The structural checklist is a non-ready precondition for a selected or grafted draft; only an adjudicated `select` result may set readiness. On pass, `readiness_evidence` records `{ gate: "standard-validation", result: "passed" }`, every selected candidate path, and the adjudication path.

### Default completion

In `delivery_mode: approval-required` without explicit publication intent, return:

```md
## Plan Draft Persisted
- Status: `<draft | ready>`; no Plan published.
- Draft: `<candidate-key>.draft.md` (revision <n>)
- Next: review this draft or explicitly ask to publish it.
```

## Publication (slice Plan)

Each Plan is the executable contract for one bounded vertical slice, not the complete objective. Write to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/plans/plan-<n>.md` path. It must include the active Brief identity, upstream artifacts, observed target, and `artifact_role: plan`.

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
3. In `delivery_mode: autonomous`, one unambiguous eligible (`readiness: ready`) draft for the active Brief.
4. A clarification prompt if more than one candidate remains plausible.

Clear intent — "implement this," "proceed with this plan," "make this the next slice" — or `delivery_mode: autonomous` — publishes the resolved draft's current re-read revision.

Before writing either Plan, re-read the resolved draft and confirm it is the current revision, has a valid `plan-draft` envelope, and its pinned candidate's `brief_id` and `brief_revision` match the active Brief.

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

Both forms rename the resolved current draft to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/plans/plan-<n>.md` path, replace draft-only envelope fields with `artifact_role: plan`, `artifact_id: plan-<n>`, and the applicable Plan readiness, and retain its pinned candidate, adjudication, `revision`, `revised_at`, and `revision_summary`. Update the absolute `<invocation_dir>/.agent-contexts/active.md` path and reset `latest_attempt` to `null`. Do not retain a duplicate source draft. In the same step, delete every other candidate and adjudication file under `current_run` — the pinned pair is the only one execution still reads; a rejected alternative is never consulted again.

Successive slice Plans are sequential contracts. Use `supersedes` only to replace a defective or obsolete Plan.

All artifacts include `wf-artifact/v1` metadata.

## Post-slice routing

After a successful slice (accepted Operator → Verify → Review), the conductor compares slice evidence with the Brief:

- **Work remains:** plan the next slice from the current repository state and accepted evidence. Return to Plan dispatch.
- **Work remains in `delivery_mode: autonomous`:** plan, publish, and execute the next unambiguous ready slice.
- **Route, acceptance, or safety boundary changed:** return to Research or Think.
- **All Brief AC IDs covered:** run final Brief-wide Verify and Review (see [references/act.md](act.md)).

## Publication format

```md
## Plan Published
- Status: plan-<n> persisted at `<invocation_dir>/.agent-contexts/work/<work-id>/plans/plan-<n>.md`; `<invocation_dir>/.agent-contexts/active.md` updated.
- Next: run `/act` or inspect the plan.
```
