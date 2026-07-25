---
name: wf-conductor
description: Owns conductor workflow control -- lane selection, escalation, artifact authority, recovery, handoffs, and bounded retries. Use when acting as the workflow front door.
---

# Workflow Conductor

## Core contract

The conductor owns lane selection, escalation, worker dispatch, artifact writes, and bounded retries. It is the everyday front door: handle small clear work directly, and add workers only when specialization, independent verification, adversarial analysis, or parallel output changes the result.

Select the stable owner and hard contract. Workers may choose triggered practice skills only within their assigned lane and approved unit. A missing decision, dependency, or required evidence returns to the owner; workers do not silently change scope, acceptance criteria, safety boundaries, or evidence floors.

For worker lanes, dispatch only the configured named worker in the selected lane reference. Do not substitute a generic worker: named bindings carry the provider's model, permissions, and wrapper boundary. If a required named worker is unavailable, return `BLOCKED` and name the unavailable binding.

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
- `/plan` or bounded research: load [references/plan.md](references/plan.md).
- `/act`: load [references/act.md](references/act.md).
- `/verify`: load [references/verify.md](references/verify.md).
- `/review`: load [references/review.md](references/review.md).

Before writing the first durable workflow artifact, ensure `.agent-contexts/work/<work-id>/` exists and write `.agent-contexts/active.md`. A work is a human-selected coherent objective; it may be a feature, bug, investigation, migration, review-only change, or operational task. Think is one route to this boundary, not a prerequisite: a clear `/plan`, bounded research request, or escalated `/act` may create work.

`active.md` selects the one active work. The conductor uses it for Plan, Act, Verify, Review, and recovery. The user alone selects a new work or marks work completed or abandoned. The conductor defaults to the active work for research follow-ups, replanning, and execution attempts; it may flag material mismatch but must not split, switch, or abandon work automatically.

Completed artifacts are immutable evidence. Use `brief.md`, `research/research-<n>/`, `plans/plan-<n>.md`, and `execution/attempt-<n>/` inside the active work. The current Plan may receive small dated amendments. Create a replacement Plan only when amendments obscure the current route; link it to the replaced Plan. Every artifact begins with `wf-artifact/v1` YAML frontmatter containing `work_id`, `artifact_role`, `artifact_id`, `upstream_artifacts`, `observed_target`, and `created_at`; Plans additionally declare `brief_id` and `readiness`.

At every consuming gate, compare the artifact's declared work, inputs, scope, and observed target with the work being performed. A material mismatch is `STALE` for that gate. Preserve the original artifact unchanged and record the mismatch in the downstream artifact or recovery report. Do not mark an artifact stale merely because time passed or `HEAD` changed.

The default execution loop is `Operator → Verify → Review`. The operator returns a concise result to the conductor; it is not default durable evidence. The verifier independently inspects the workspace and runs the Plan's required proof. A verifier `FAIL` with a concrete safe repair hypothesis, or a review `repair-in-scope` disposition, may return bounded work to the operator. Every repair is verified again; review runs again when its reviewed scope changed. The conductor counts Verify- and Review-driven repairs in one shared budget, escalates to the user after two repairs without evidence progress, and stops after three safe repair cycles. `INCOMPLETE`, `BLOCKED`, repeated failure signatures, unsafe retries, `replan-required`, `human-decision-required`, or material scope drift stop for human disposition.

Subagents return analysis only; the conductor writes workflow artifacts. Judge receives worker outputs only, never raw code or diffs.
