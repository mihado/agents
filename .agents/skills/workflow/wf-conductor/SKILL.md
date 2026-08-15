---
name: wf-conductor
description: Owns conductor workflow control -- lane selection, escalation, artifact authority, recovery, handoffs, and bounded retries. Use when acting as the workflow front door.
---

# Workflow Conductor

## Core contract

The conductor owns lane selection, escalation, worker dispatch, artifact writes, and bounded retries. It is the everyday front door: handle small clear work directly, and add workers only when specialization, independent verification, adversarial analysis, or parallel output changes the result.

Select the stable owner and hard contract. Workers may choose triggered practice skills only within their assigned lane and approved unit. A missing decision, dependency, or required evidence returns to the owner; workers do not silently change scope, acceptance criteria, safety boundaries, or evidence floors.

For worker lanes, dispatch only the configured named worker in the selected lane reference. Do not substitute a generic worker: named bindings carry the provider's model, permissions, and wrapper boundary. If a required named worker is unavailable, return `BLOCKED` and name the unavailable binding.

## Named worker dispatch bindings

| Dispatch purpose | Worker | Required skill | Mode |
| --- | --- | --- | --- |
| Constructive research | `planner` | `wf-research` | `research` |
| Adversarial research | `planner-adversarial` | `wf-research` | `adversarial` |
| Research or review adjudication | `judge` | `wf-judge` | — |
| Execution planning | `planner` | `wf-planning` | `execution` |
| Adversarial planning | `planner-adversarial` | `wf-planning` | `adversarial` |
| Execution | `operator` | `wf-execution` | — |
| Verification | `verifier` | `wf-verification` | — |
| Standards review | `reviewer` | `wf-review` | `standards-spec` |
| Adversarial review | `reviewer-adversarial` | `wf-review` | `adversarial-risk` |

| Lane | Stable owner | Output and gate |
| --- | --- | --- |
| Idea | conductor | Resolve intent, scope, and constraints before a Brief. |
| Think | conductor | Write a Brief after repository facts are inspected and user decisions are settled. |
| Plan | `wf-planning` or `wf-research` | Write an execution plan or bounded research artifacts. |
| Act | `wf-execution` | Apply approved units and return a bounded execution result. |
| Verify | `wf-verification` | Write a verification artifact with `PASS`, `FAIL`, `INCOMPLETE`, or `BLOCKED`. |
| Review | `wf-review` | `standards-spec` by default; `adversarial-risk` when elevated. |
| Ship | conductor | Release only on explicit user request, with rollback and operational proof. |

## User-facing behavior

- Lead with the answer and its material caveat.
- Report outcomes, not worker mechanics, unless mechanics explain a blocker.
- Keep responses proportional to the decision the user needs to make.
- Never expose chain-of-thought, scratchpad notes, or tool narration.
- For recovery and lane completion, use the stable format in the selected reference.

## Branch selection

- Re-orientation intent such as “where are we?” or “catch me up”: load [references/recovery.md](references/recovery.md).
- Direct unresolved intent or ambiguous scope: load [references/think.md](references/think.md) and start in Idea discipline.
- `/think`: load [references/think.md](references/think.md).
- `/plan`, bounded research, or settled intent that requires evidence before execution: load [references/plan.md](references/plan.md).
- `/act`: load [references/act.md](references/act.md).
- `/verify`: load [references/verify.md](references/verify.md).
- `/review`: load [references/review.md](references/review.md).

Before writing the first durable workflow artifact, ensure `.agent-contexts/work/<work-id>/` exists and write `.agent-contexts/active.md`. A work is a human-selected coherent objective; it may be a feature, bug, investigation, migration, review-only change, or operational task. Think is one route to this boundary, not a prerequisite: a clear `/plan`, bounded research request, or escalated `/act` may create work.

`active.md` selects the one active work. The conductor uses it for Plan, Act, Verify, Review, and recovery. The user alone selects a new work or marks work completed or abandoned. The conductor defaults to the active work for research follow-ups, replanning, and execution attempts; it may flag material mismatch but must not split, switch, or abandon work automatically.

### `active.md` format

The frontmatter is the machine authority. The body is a human-readable duplicate for navigation.

```yaml
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: active-work
artifact_id: active-<n>
upstream_artifacts: []
observed_target: <target>
created_at: <ISO-8601 timestamp>
current_artifact_path: work/<work-id>/<canonical-artifact-path>
current_artifact_id: <artifact-id>
---
```

**`current_artifact_path`** is mandatory and must:
- be a canonical path relative to `.agent-contexts/` (the directory containing `active.md`);
- resolve directly to the selected durable artifact file;
- never be inferred or searched by artifact ID;
- use the artifact layout defined by this workflow (see below).

**`current_artifact_id`** is mandatory and must match the YAML `artifact_id` inside the file at `current_artifact_path`.

Body format:

```md
# Active Work

`<work-id>` is the active work.

Current artifact: [<relative-display-path>](work/<work-id>/<canonical-artifact-path>) (`<artifact-id>`)
```

The Markdown link is for human navigation only. `current_artifact_path` in the frontmatter is the recovery authority.

### Canonical artifact paths

Every durable artifact location defined by this workflow:

| Artifact | Path (relative to `.agent-contexts/`) | `artifact_role` |
| --- | --- | --- |
| Brief | `work/<work-id>/brief-<n>.md` | `brief` |
| Constructive research report | `work/<work-id>/research/research-<n>/planner.md` | `research-report` |
| Adversarial research report | `work/<work-id>/research/research-<n>/planner-adversarial.md` | `research-report` |
| Research synthesis | `work/<work-id>/research/research-<n>/synthesis.md` | `research-synthesis` |
| Execution plan | `work/<work-id>/plans/plan-<n>.md` | `plan` |
| Verification | `work/<work-id>/execution/attempt-<n>/verify.md` | `verification` |
| Review | `work/<work-id>/execution/attempt-<n>/review.md` | `review` |

`current_artifact_path` must be one of these canonical forms. Do not invent additional artifact paths; if a new durable artifact type is needed, define it in this table first.

### Artifact pointer examples

After a Brief is written:
```yaml
current_artifact_path: work/my-feature/brief-01.md
current_artifact_id: brief-01
```

After a research synthesis is complete:
```yaml
current_artifact_path: work/my-feature/research/research-02/synthesis.md
current_artifact_id: research-02-synthesis
```

After an execution plan is written:
```yaml
current_artifact_path: work/my-feature/plans/plan-01.md
current_artifact_id: plan-01
```

After verification of an execution attempt:
```yaml
current_artifact_path: work/my-feature/execution/attempt-01/verify.md
current_artifact_id: attempt-01-verify
```

### Recovery from `active.md`

1. Parse `active.md` frontmatter.
2. Resolve `current_artifact_path` exactly — no search, no fallback.
3. Read the target artifact.
4. Verify the target artifact's `work_id`, `artifact_id`, `artifact_role`, and declared `upstream_artifacts` against the active-work pointer and the current gate.
5. Report `STALE` or `BLOCKED` if:
   - the path is missing or does not resolve to an existing file;
   - the path escapes `.agent-contexts/`;
   - the target artifact's metadata does not match the active-work pointer;
   - `current_artifact_id` does not match the target's YAML `artifact_id`.
6. Never search the workspace for an artifact ID as a fallback.

### Artifact authority

- Workers return reports only; the conductor writes durable workflow artifacts.
- YAML `artifact_id` identifies an artifact but does not locate its file.
- The `current_artifact_path` in `active.md` frontmatter is the machine-resolvable locator.
- The Markdown link in the body is a human-facing duplicate.

---

Completed artifacts are immutable evidence. Use `brief-<n>.md`, `research/research-<n>/`, `plans/plan-<n>.md`, and `execution/attempt-<n>/` inside the active work. The current Plan may receive small dated amendments. Create a replacement Plan only when amendments obscure the current route; link it to the replaced Plan. Every artifact begins with `wf-artifact/v1` YAML frontmatter containing `work_id`, `artifact_role`, `artifact_id`, `upstream_artifacts`, `observed_target`, and `created_at`. A persisted execution Plan additionally declares its settled `brief_id` and exactly `readiness: implementation-ready`; no other readiness value is valid for a Plan. The conductor must not point `active.md` at a Plan unless it meets this gate.

At every consuming gate, compare the artifact's declared work, inputs, scope, and observed target with the work being performed. A material mismatch is `STALE` for that gate. Preserve the original artifact unchanged and record the mismatch in the downstream artifact or recovery report. Do not mark an artifact stale merely because time passed or `HEAD` changed.

The default execution loop is `Operator → Verify → Review`. The operator returns a concise result to the conductor; it is not default durable evidence. The verifier independently inspects the workspace and runs the Plan's required proof. A verifier `FAIL` with a concrete safe repair hypothesis, or a review `repair-in-scope` disposition, may return bounded work to the operator. Every repair is verified again; review runs again when its reviewed scope changed. The conductor counts Verify- and Review-driven repairs in one shared budget, escalates to the user after two repairs without evidence progress, and stops after three safe repair cycles. `INCOMPLETE`, `BLOCKED`, repeated failure signatures, unsafe retries, `replan-required`, `human-decision-required`, or material scope drift stop for human disposition.

Subagents return analysis only; the conductor writes workflow artifacts. Judge receives worker outputs only, never raw code or diffs.
