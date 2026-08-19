# Artifact State Transitions

The authoritative reference for `active.md` pointer semantics, artifact lineage, and lifecycle transitions.

## Pointer rules

- `current_artifact_path` tracks the governing decision-point artifact — Brief or executable Plan. It is the entry point for recovery and lane gates.
- During execution, `current_artifact_path` stays on the governing Plan. Execution evidence lives in attempt directories.
- `latest_attempt` names the most recent attempt or final directory, relative to `.agent-contexts/` (e.g. `work/<work-id>/execution/attempt-01`). Updated on each attempt start. `null` before first execution or after a Plan supersession.

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
---
```

Closure adds: `work_status: completed|abandoned`, `closed_at`, `closure_reason`.

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
| Work closed | unchanged | unchanged |

## Canonical paths

All paths relative to `.agent-contexts/`:

| Artifact | Path | `artifact_role` |
| --- | --- | --- |
| Brief | `work/<work-id>/brief-<n>.md` | `brief` |
| Constructive research | `work/<work-id>/research/research-<n>/planner.md` | `research-report` |
| Adversarial research | `work/<work-id>/research/research-<n>/planner-adversarial.md` | `research-report` |
| Research synthesis | `work/<work-id>/research/research-<n>/synthesis.md` | `research-synthesis` |
| Plan draft | `work/<work-id>/plans/<candidate-key>.draft.md` | `plan-draft` |
| Execution plan | `work/<work-id>/plans/plan-<n>.md` | `plan` |
| Operator result | `work/<work-id>/execution/attempt-<n>/operator.md` | `operator-result` |
| Verification (slice) | `work/<work-id>/execution/attempt-<n>/verify.md` | `verification` |
| Review (in-loop) | `work/<work-id>/execution/attempt-<n>/review.md` | `review` |
| Review (standalone) | `work/<work-id>/reviews/review-<n>.md` | `standalone-review` |
| Final manifest | `work/<work-id>/execution/final-<n>/manifest.md` | `final-manifest` |
| Final verification | `work/<work-id>/execution/final-<n>/verify.md` | `final-verification` |
| Final review | `work/<work-id>/execution/final-<n>/review.md` | `final-review` |

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
| `brief` | `brief-<n>` | `[]` for first; `[brief-<prev>, research-<m>-synthesis]` for supersession | `supersedes`, `supersession_reason` (supersession only); `revision`, `revised_at`, `revision_summary` (user-directed in-place revision only) |
| `research-report` | `research-<n>-planner` or `research-<n>-planner-adversarial` | `[brief-<n>]` | — |
| `research-synthesis` | `research-<n>-synthesis` | `[research-<n>-planner, research-<n>-planner-adversarial]` | — |
| `plan-draft` | `draft-<candidate-key>` | `[brief-<n>]` | `brief_id`, `candidate_key`, `readiness: draft|ready`, `revision`, `revised_at`, `revision_summary`, `readiness_revision` + `readiness_gate` + `readiness_evidence` + `ready_at` (when ready) |
| `plan` | `plan-<n>` | Ordinary first: `[brief-<n>]`. Ordinary successor: `[brief-<n>, plan-<prev>, attempt-<m>-verify, attempt-<m>-review]`. Superseding: `[brief-<n>, plan-<prev>, <evidence motivating replacement>]`. Human-approved: `[brief-<n>]` plus any known prior Plan or evidence IDs; accepted predecessor Verify/Review evidence is not required. | `brief_id`, `revision`, `revised_at`, `revision_summary`, `readiness: implementation-ready|human-approved`, `approval` (human-approved only), `supersedes` + `supersession_reason` (supersession only) |
| `operator-result` | `attempt-<n>-operator` | `[plan-<n>]` | — |
| `verification` | `attempt-<n>-verify` | `[plan-<n>, attempt-<n>-operator]`. Standalone: `[plan-<n>]` | `verification_mode: standalone` (standalone only) |
| `review` | `attempt-<n>-review` | `[plan-<n>, attempt-<n>-verify]` | — |
| `standalone-review` | `review-<n>` | `[plan-<n>]` or `[]` | `diff_ref` |
| `final-manifest` | `final-<n>-manifest` | `[brief-<n>, <all accepted slice Plan, Verify, and Review IDs>]` | `baseline_target`, `accepted_slices`, `cumulative_commands`, `all_ac_ids`, `cumulative_only_acs`, `diff_base` |
| `final-verification` | `final-<n>-verify` | `[brief-<n>, final-<n>-manifest, <all accepted slice verify IDs>]` | `verification_mode: final`, `diff_base`, `cumulative_commands` |
| `final-review` | `final-<n>-review` | `[brief-<n>, final-<n>-verify, final-<n>-manifest, <all accepted slice review IDs>]` | `diff_base` |

### Target semantics

- `observed_target` records repository state at production time — observational, not prescriptive.
- A Plan's `observed_target` is the **baseline**: the state the Plan was designed against.
- Execution evidence records its own target. Plan-authorized diff is expected drift. Unrelated drift is a material mismatch.

### Staleness

At every consuming gate, compare declared work, inputs, scope, and target with current state. Material mismatch (unrelated to Plan-authorized changes) is `STALE`. Preserve original unchanged; record mismatch downstream.

### Immutability and supersession

Completed artifacts are immutable evidence. Drafts are working artifacts and follow their own revision rule below.

**Plan revisions:** The human decides whether a requested change is immaterial or material. The conductor may explain the consequences and recommend a classification, but does not decide against the human. An immaterial revision updates the active Plan in place, increments `revision`, and updates `revised_at` and `revision_summary`; it may occur after attempts exist. The latest revision governs future work, and earlier evidence remains valid under that revision. A material change requires a superseding Plan with `supersedes` and `supersession_reason`; reset `latest_attempt` to `null`.

**User-directed current-state revisions:** The decision owner may revise the active Brief or an unexecuted draft directly. Preserve existing execution evidence unchanged. A Brief revision clears `latest_attempt` and returns to Plan before new execution. If it changes an AC's meaning, existing evidence for that AC becomes historical context and cannot satisfy final-gate eligibility unless the decision owner explicitly reaffirms it. Active Plan revisions follow the human-classified immaterial/material rule above.

An in-place Brief revision starts at `revision: 1` and increments on each subsequent user-directed revision. It updates `revised_at` and `revision_summary`. A Brief without a user-directed revision omits these fields.

**Plan drafts:** working artifacts representing candidate slices. Schema constraints:

- `artifact_id`: `draft-<candidate-key>` where `candidate_key` is descriptive kebab-case (e.g. `agent-chat-foundation`).
- `readiness`: `draft` or `ready`. Any revision resets `readiness` to `draft` and clears the readiness record.
- When `readiness: ready`:
  - `readiness_revision`: the `revision` value that passed the gate. Ordinary publication requires `readiness_revision == revision`.
  - `readiness_gate`: `standard-validation` or `elevated-final-adversarial`.
  - `readiness_evidence`: structured list. Each entry is one of:
    - A gate attestation: `{ gate: "<gate-name>", result: "passed" }` — records that the named gate's checklist was satisfied for this revision.
    - An artifact ID or persisted report path: `"<artifact-id-or-path>"` — references durable evidence consumed or produced by the gate.
  - `ready_at`: ISO-8601 timestamp of gate passage.
- `revision`: integer starting at 1. Incremented on each in-place revision; `revised_at` and `revision_summary` updated alongside.
- Multiple drafts may coexist. Revisions update the same `candidate_key` in place; do not use `supersedes` or draft-to-draft lineage.
- Drafts are discovered from `plans/`; they are not recorded in `active.md`.
- Publishing renames the named draft at its current revision to `plan-<n>.md` and changes its envelope to `artifact_role: plan` with `artifact_id: plan-<n>`. It is no longer a draft. Ordinary publication requires `readiness: ready` with matching `readiness_revision` and normal Plan lineage. Explicit human approval may publish the current matching draft without ordinary readiness, completeness, or lineage requirements (see human-approved Plans below).

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
