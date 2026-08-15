# Artifact State Transitions

The authoritative reference for `active.md` pointer semantics, artifact lineage, and lifecycle transitions.

## Pointer rules

- `current_artifact_path` tracks the latest **decision-point** artifact — Brief, research synthesis, or Plan. It is the entry point for recovery and lane gates.
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
| Research synthesis persisted | `research/research-<n>/synthesis.md` | `null` |
| Research rejected | restored to prior Brief | `null` |
| Plan passes readiness gate | `plans/plan-<n>.md` | `null` |
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
| `brief` | `brief-<n>` | `[]` for first; `[brief-<prev>, research-<m>-synthesis]` for supersession | `supersedes`, `supersession_reason` (supersession only) |
| `research-report` | `research-<n>-planner` or `research-<n>-planner-adversarial` | `[brief-<n>]` | — |
| `research-synthesis` | `research-<n>-synthesis` | `[research-<n>-planner, research-<n>-planner-adversarial]` | — |
| `plan` | `plan-<n>` | First: `[brief-<n>]`. Successor: `[brief-<n>, plan-<prev>, attempt-<m>-verify, attempt-<m>-review]`. Superseding: `[brief-<n>, plan-<prev>, <evidence motivating replacement>]` | `brief_id`, `readiness: implementation-ready`, `supersedes` + `supersession_reason` (supersession only) |
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

Completed artifacts are immutable evidence.

**Plan amendments:** non-semantic clarification only, and only before execution evidence exists (`latest_attempt` not yet set). Semantic changes require a superseding Plan with `supersedes` and `supersession_reason`. Reset `latest_attempt` to `null`.

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
