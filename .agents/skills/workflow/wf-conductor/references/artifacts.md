# Artifact State Transitions

The authoritative reference for `active.md` pointer semantics, artifact lineage, and lifecycle transitions.

## Pointer rules

- `current_artifact_path` tracks the governing decision-point artifact — Brief or executable Plan. It is the entry point for recovery and lane gates.
- During execution, `current_artifact_path` stays on the governing Plan. Execution evidence lives in attempt directories.
- `latest_attempt` names the most recent attempt or final directory, relative to `.agent-contexts/` (e.g. `work/<work-id>/execution/attempt-01`). Updated on each attempt start. It is `null` before first execution, whenever authority moves to a new Plan or back to the Brief, and when work is abandoned.

## `active.md` schema

```yaml
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: active-work
artifact_id: active-<n>
upstream_artifacts: []
observed_target: <branch:ref, head:sha-prefix, worktree:clean|dirty>
created_at: <ISO-8601 timestamp>
work_status: active
current_artifact_path: work/<work-id>/<canonical-artifact-path>
current_artifact_id: <artifact-id>
latest_attempt: <work/<work-id>/execution/attempt-<n> | work/<work-id>/execution/final-<n> | null>
delivery_mode: <approval-required | autonomous>
---
```

`delivery_mode` is durable work authority. It defaults to `approval-required`. A direct autonomous-delivery instruction sets it to `autonomous`; an explicit pause or mode change updates it. Closure adds: `work_status: completed|abandoned`, `closed_at`, `closure_reason`, and resets `delivery_mode` to `approval-required`.

Body: `# Active Work` with `<work-id>`, Markdown link to artifact, and `(<artifact-id>)`.

## Decision-point transitions

| Event | `current_artifact_path` moves to | `latest_attempt` |
| --- | --- | --- |
| Think writes first Brief | `brief-01.md` | `null` |
| Think writes superseding Brief | `brief-<n>.md` | `null` |
| User-directed active Brief revision | unchanged (revised Brief) | `null` |
| Plan draft persisted or revised | unchanged | unchanged |
| Selected draft renamed and published (ordinary or human-approved) | `plans/plan-<n>.md` | `null` |
| Human-classified immaterial Plan revision | unchanged | unchanged |
| Plan superseded | `plans/plan-<n+1>.md` | `null` (reset) |
| Slice attempt starts | unchanged (stays on Plan) | `work/<work-id>/execution/attempt-<n>` |
| Final gate starts | unchanged (stays on Plan) | `work/<work-id>/execution/final-<n>` |
| Work completed | unchanged | unchanged |
| Work abandoned | unchanged | `null` (reset) |

## Canonical paths

All paths relative to `.agent-contexts/`:

| Artifact | Path | `artifact_role` |
| --- | --- | --- |
| Brief | `work/<work-id>/brief-<n>.md` | `brief` |
| Constructive research | `work/<work-id>/research/research-<n>/planner.md` | `research-report` |
| Adversarial research | `work/<work-id>/research/research-<n>/planner-adversarial.md` | `research-report` |
| Research synthesis | `work/<work-id>/research/research-<n>/synthesis.md` | `research-synthesis` |
| Plan candidate | `work/<work-id>/planning/<candidate-key>/run-<n>/candidate-<n>.md` | `plan-candidate` |
| Plan draft | `work/<work-id>/plans/<candidate-key>.draft.md` | `plan-draft` |
| Plan adjudication | `work/<work-id>/planning/<candidate-key>/run-<n>/adjudication-<n>.md` | `plan-adjudication` |
| Execution plan | `work/<work-id>/plans/plan-<n>.md` | `plan` |
| Operator result | `work/<work-id>/execution/attempt-<n>/operator.md` | `operator-result` |
| Verification (slice) | `work/<work-id>/execution/attempt-<n>/verify.md` | `verification` |
| Review (in-loop) | `work/<work-id>/execution/attempt-<n>/review.md` | `review` |
| Elevated review report (standards, in-loop) | `work/<work-id>/execution/attempt-<n>/review-standards.md` | `review` |
| Elevated review report (adversarial, in-loop) | `work/<work-id>/execution/attempt-<n>/review-adversarial.md` | `review` |
| Elevated review report (standards, standalone) | `work/<work-id>/reviews/review-<n>-standards.md` | `standalone-review` |
| Elevated review report (adversarial, standalone) | `work/<work-id>/reviews/review-<n>-adversarial.md` | `standalone-review` |
| Review (standalone) | `work/<work-id>/reviews/review-<n>.md` | `standalone-review` |
| Dispatch diagnostic | `work/<work-id>/dispatch/dispatch-<id>-attempt-<n>.md` | `dispatch-diagnostic` |
| Final manifest | `work/<work-id>/execution/final-<n>/manifest.md` | `final-manifest` |
| Final verification | `work/<work-id>/execution/final-<n>/verify.md` | `final-verification` |
| Final review | `work/<work-id>/execution/final-<n>/review.md` | `final-review` |

## Dispatch inputs

The dispatch envelope (see [SKILL.md](../SKILL.md) § Dispatch envelope) carries the minimal envelope — shared `dispatch_id`, canonical `workspace_root`, declared `repository_root`, and `observed_target` — plus, for artifact-consuming dispatches, one compact, complete, ordered `inputs` list of the project inputs the worker consumes. Each entry declares:

- `path` — root-relative to `workspace_root` (no absolute paths, no `..`); this is conductor-owned artifact state, not a repository-relative path
- expected identity where applicable: `work_id`, `artifact_role`, `artifact_id`, `revision`

Before dispatch, the conductor validates each entry: the path resolves under `workspace_root` with lexical containment and resolved-path/symlink containment, and declared identity fields match the artifact's frontmatter exactly. Repository evidence (diffs, source, commands) resolves under the separately declared `repository_root`, never under `workspace_root` alone.

The first pass sends no bodies. A retry may attach only the matching validated bodies for declared inputs — never substitute, reorder, or extend the list. The list is complete: every project artifact the worker must consume is declared in it, and workers that find a required artifact missing from the list report the gap instead of reading undeclared files.

## Artifact integrity

### Common envelope

Every artifact begins with:

```yaml
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: <role from canonical table>
artifact_id: <unique ID>
upstream_artifacts: [<dependency IDs>]
observed_target: <branch:ref, head:sha-prefix, worktree:clean|dirty>
created_at: <ISO-8601 timestamp>
---
```

### Per-role requirements

| Role | `artifact_id` pattern | `upstream_artifacts` | Extra fields |
| --- | --- | --- | --- |
| `brief` | `brief-<n>` | `[]` for first; `[brief-<prev>, research-<m>-synthesis]` for supersession | `supersedes`, `supersession_reason` (supersession only); `revision`, `revised_at`, `revision_summary` (user-directed in-place revision only); `source_handoffs` (required whenever the Brief adopts a handoff or cites parent context; absent only when no such origin exists — see think.md) |
| `research-report` | `research-<n>-planner` or `research-<n>-planner-adversarial` | `[brief-<n>]` | — |
| `research-synthesis` | `research-<n>-synthesis` | `[research-<n>-planner, research-<n>-planner-adversarial]` | — |
| `plan-candidate` | `<candidate-key>-run-<n>-candidate-<n>` | `[brief-<n>]` | `brief_revision`, `planning_run`, `planner_profile`, `revision`, `revised_at`, `revision_summary` |
| `plan-draft` | `draft-<candidate-key>` | `[brief-<n>, <governing plan-candidate ID>, <plan-adjudication ID>]` | `brief_id`, `candidate_key`, `current_run`, `governing_candidate` (ID, path, revision), `adjudication` (ID, path, revision), `readiness: draft|ready`, `revision`, `revised_at`, `revision_summary`, `readiness_revision` + `readiness_gate` + `readiness_evidence` + `ready_at` (when ready) |
| `plan-adjudication` | `<candidate-key>-run-<n>-adjudication-<n>` | `[<plan-candidate IDs>]`, plus `[draft-<candidate-key>]` for re-adjudication | `planning_run`, `revision`, `revised_at`, `revision_summary` |
| `plan` | `plan-<n>` | Ordinary first: `[brief-<n>, <governing plan-candidate ID>, <plan-adjudication ID>]`. Ordinary successor: `[brief-<n>, <governing plan-candidate ID>, <plan-adjudication ID>, plan-<prev>, attempt-<m>-verify, attempt-<m>-review]`. Superseding: `[brief-<n>, <governing plan-candidate ID>, <plan-adjudication ID>, plan-<prev>, <evidence motivating replacement>]`. Human-approved: `[brief-<n>, <governing plan-candidate ID>, <plan-adjudication ID>]` plus any known prior Plan or evidence IDs. | `brief_id`, `governing_candidate` (ID, path, revision), `adjudication` (ID, path, revision), `revision`, `revised_at`, `revision_summary`, `readiness: implementation-ready|human-approved`, `approval` (human-approved only), `supersedes` + `supersession_reason` (supersession only) |
| `operator-result` | `attempt-<n>-operator` | `[plan-<n>]` | — |
| `verification` | `attempt-<n>-verify` | `[plan-<n>, attempt-<n>-operator]`. Standalone: `[plan-<n>]` | `verification_mode: standalone` (standalone only) |
| `review` | `attempt-<n>-review` (in-loop elevated reports: `attempt-<n>-review-standards` / `attempt-<n>-review-adversarial`) | `[plan-<n>, attempt-<n>-verify]`; the synthesized two-reviewer result adds both elevated report IDs | — |
| `standalone-review` | `review-<n>` (elevated reports: `review-<n>-standards` / `review-<n>-adversarial`) | `[brief-<n>]`, extended by a `plan-<n>` and/or `attempt-<m>-verify` entry for each Plan/verifier artifact the invocation supplies; the synthesized two-reviewer result adds both elevated report IDs | `diff_ref` |
| `dispatch-diagnostic` | `dispatch-<id>-attempt-<n>` | `[]` | `dispatch_id`, `failure_class`, `reason`, `retry_of`, `retry_ordinal`, `failed_at` |
| `final-manifest` | `final-<n>-manifest` | `[brief-<n>, <all accepted slice Plan, Verify, and Review IDs>]` | `baseline_target`, `accepted_slices`, `cumulative_commands`, `all_ac_ids`, `cumulative_only_acs`, `diff_base` |
| `final-verification` | `final-<n>-verify` | `[brief-<n>, final-<n>-manifest, <all accepted slice verify IDs>]` | `verification_mode: final`, `diff_base`, `cumulative_commands` |
| `final-review` | `final-<n>-review` | `[brief-<n>, final-<n>-manifest, final-<n>-verify, <all accepted slice Plan, Verify, and Review IDs>]` | `diff_base` |

### Target semantics

- `observed_target` records repository state at production time — observational, not prescriptive.
- A Plan's `observed_target` is the **baseline**: the state the Plan was designed against.
- Execution evidence records its own target. Plan-authorized diff is expected drift. Unrelated drift is a material mismatch.

### Staleness

At every consuming gate, compare declared work, inputs, scope, and target with current state. Material mismatch (unrelated to Plan-authorized changes) is `STALE`. Preserve original unchanged; record mismatch downstream.

A `source_handoffs` entry that no longer resolves is recorded as a mismatch, never silently dropped — the Brief's own text is unaffected, but the broken link is surfaced rather than quietly disappearing from the audit trail.

### Immutability and supersession

Completed artifacts are immutable evidence. Drafts are working artifacts and follow their own revision rule below.

**Plan revisions:** The human decides whether a requested change is immaterial or material. The conductor may explain the consequences and recommend a classification, but does not decide against the human. An immaterial revision updates the active Plan in place, increments `revision`, and updates `revised_at` and `revision_summary`; it may occur after attempts exist. The latest revision governs future work, and earlier evidence remains valid under that revision. A material change requires a superseding Plan with `supersedes` and `supersession_reason`; reset `latest_attempt` to `null`.

**User-directed current-state revisions:** The decision owner may revise the active Brief or an unexecuted draft directly. Preserve existing execution evidence unchanged. A Brief revision clears `latest_attempt` and returns to Plan before new execution. If it changes an AC's meaning, existing evidence for that AC becomes historical context and cannot satisfy final-gate eligibility unless the decision owner explicitly reaffirms it. Active Plan revisions follow the human-classified immaterial/material rule above.

An in-place Brief revision starts at `revision: 1` and increments on each subsequent user-directed revision. It updates `revised_at` and `revision_summary`. A Brief without a user-directed revision omits these fields.

**Planning runs:** current candidate and adjudication working papers for one proposed slice live at `planning/<candidate-key>/run-<n>/`, named by the governing draft's `current_run`. `candidate_key` identifies the observable slice, not its current wording. Before reuse, confirm the existing key has the same observable outcome; otherwise use a distinct key. A graft's output is either **expand** (before selection: a new `candidate-<n+1>`/`adjudication-<n+1>` pair joins the still-open set) or **rework** (after selection, on a structural-readiness failure: the pinned candidate and its adjudication revise in place, incrementing `revision` and updating `revised_at`/`revision_summary`) — see [plan.md](plan.md) § Candidate panel and bounded graft for the branch condition. Every consuming dispatch pins the expected revision in its input list either way. Start `run-<n+1>` only when the active Brief ID changes, the slice's own observable outcome changes, or the prior run stopped; delete the superseded run once the new run's first candidate is persisted. Draft revisions remain in `plans/` and do not create another run. On publication, delete every candidate and adjudication in `current_run` except the pinned pair — the rest is never read again.

**Plan drafts:** working artifacts that select one complete candidate. Schema constraints:

- `artifact_id`: `draft-<candidate-key>` where `candidate_key` is descriptive kebab-case (e.g. `agent-chat-foundation`).
- `governing_candidate` pins one persisted `plan-candidate` by artifact ID, workspace-relative path, and revision. Its `brief_id` and `brief_revision` must match the active Brief. `adjudication` pins the persisted `plan-adjudication` selecting that revision. A newer candidate never changes the draft without a new adjudication and draft revision.
- `readiness`: `draft` or `ready`. Any revision resets `readiness` to `draft` and clears the readiness record.
- When `readiness: ready`:
  - `readiness_revision`: the `revision` value that passed the gate. Ordinary publication requires `readiness_revision == revision`.
  - `readiness_gate`: `standard-validation` or `panel-adjudication`.
  - `readiness_evidence`: structured list. Each entry is one of:
    - A gate attestation: `{ gate: "<gate-name>", result: "passed" }` — records that the named gate's checklist was satisfied for this revision.
    - An artifact ID or persisted report path: `"<artifact-id-or-path>"` — references durable evidence consumed or produced by the gate.
  - `ready_at`: ISO-8601 timestamp of gate passage.
- `revision`: integer starting at 1. Incremented on each in-place revision; `revised_at` and `revision_summary` updated alongside.
- Panel revisions append a compact progress record to `revision_summary` for every cited concern — the concern identifier or short statement, `concern_origin` (the persisted adjudication path/ID plus finding identifier for the first report raising that concern; later reports raising the same unresolved concern retain that `concern_origin` and record their current source path/ID alongside), the route attempted, and the evidence-backed outcome (`resolved`, `narrowed`, `disproved`, or `no-progress`) — preserving prior entries. A structural readiness concern's `concern_origin` combines the persisted draft artifact ID and revision with the checklist item number instead of a report path/ID. The record lives inside `revision_summary`; ordinary drafts and lightweight revisions keep a concise `revision_summary`, and no separate progress artifact is created.
- Multiple drafts may coexist. Revisions update the same `candidate_key` in place; do not use `supersedes` or draft-to-draft lineage.
- `plans/` contains only drafts and published execution Plans. Planning working papers are discovered from `planning/`; neither is recorded in `active.md`.
- Publishing renames the named draft at its current revision to `plan-<n>.md` and changes its envelope to `artifact_role: plan` with `artifact_id: plan-<n>`. It retains the draft's pinned candidate and adjudication, and is no longer a draft. Ordinary publication requires `readiness: ready` with matching `readiness_revision` and normal Plan lineage. Explicit human approval may publish the current matching draft without ordinary readiness, completeness, or lineage requirements (see human-approved Plans below).

**Human-approved Plans:** `readiness: human-approved` authorizes a human-directed co-development starting point. It requires a valid draft envelope, matching active Brief, explicit human affirmation, and `approval` with unresolved items, accepted concerns, and an execution escalation boundary. It may bypass ordinary readiness, completeness, and successor-lineage gates. The operator returns `NEEDS_CONTEXT` when discovery crosses that boundary.

## Final gate

The final gate runs when cumulative accepted slice evidence covers all Brief ACs. It uses `execution/final-<n>/` to distinguish from slice execution.

### Cumulative evidence manifest

The conductor assembles and **persists** this as `execution/final-<n>/manifest.md` before dispatching final verification. It is the durable authority proving what the final verifier and reviewer received.

```yaml
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: final-manifest
artifact_id: final-<n>-manifest
upstream_artifacts:
  - brief-<n>
  - <all accepted slice Plan, Verify, and Review IDs>
observed_target: <branch:ref, head:sha-prefix, worktree:clean|dirty>
created_at: <ISO-8601 timestamp>
baseline_target: <observed_target from plan-01>
accepted_slices:
  - plan_id: plan-01
    verify_id: attempt-01-verify
    review_id: attempt-01-review
    acs_advanced: [AC1, AC2]
  - plan_id: plan-02
    verify_id: attempt-03-verify
    review_id: attempt-03-review
    acs_advanced: [AC3]
cumulative_commands:
  - <exact command from plan-01>
  - <exact command from plan-02>
all_ac_ids: [AC1, AC2, AC3, AC4]
cumulative_only_acs: [AC4]
diff_base: <observed_target.head from plan-01 baseline>
---
```

Must account for every Brief AC exactly once: via an accepted slice or as `cumulative-only`.

The final verifier executes all cumulative commands and assesses every Brief AC. The final reviewer examines the cumulative diff from baseline and the complete Brief scope.
