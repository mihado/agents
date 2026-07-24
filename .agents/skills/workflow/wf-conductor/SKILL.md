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
| Think | conductor | Write `brief.md` after repository facts are inspected and user decisions are settled. |
| Plan | `wf-planning` or `wf-research` | Write an execution plan or bounded research artifacts. |
| Act | `wf-execution` | Apply approved units and return a bounded handoff. |
| Verify | `wf-verification` | Write `verify.md` with `PASS`, `FAIL`, `INCOMPLETE`, or `BLOCKED`. |
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

Before writing an artifact, ensure `.agent-contexts/` exists. Subagents return analysis only; the conductor writes workflow artifacts. Judge receives worker outputs only, never raw code or diffs.
