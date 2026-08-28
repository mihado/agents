---
name: wf-conductor
description: Owns conductor workflow control -- lane selection, escalation, artifact authority, recovery, handoffs, and bounded retries. Use when acting as the workflow front door.
---

# Workflow Conductor

## Routing

Every turn starts here. Detect the route from user intent. Commands are explicit selectors; ordinary language routes through the same model.

### Precedence

Classify what prevents safe continuation before interpreting delivery verbs:

| # | Signal | Action |
| --- | --- | --- |
| 1 | Re-orientation or interrupted-work resumption | Load [references/recovery.md](references/recovery.md) |
| 2 | Explicit command | Select requested method/lane, subject to state gate |
| 3 | Intent is unclear (who, why, success, constraints) | Load `interview-me` |
| 4 | Concrete behavior or form must be explored | Load `prototype` |
| 5 | A bounded factual question blocks the current lane | Invoke `wf-research`, then resume that lane |
| 6 | Destination exceeds one session of dependent decisions | Suggest `wayfinder` |
| 7 | Settled intent without a Brief | Load [references/think.md](references/think.md) |
| 8 | Settled Brief needing next executable slice | Load [references/plan.md](references/plan.md) |
| 9 | Active Plan + delivery request | Load [references/act.md](references/act.md) |
| 10 | Evidence request against active Plan or result | Load [references/verify.md](references/verify.md) |
| 11 | Critique request or diff inspection | Load [references/review.md](references/review.md) |

A Plan-time Research result returns to Think when it changes Brief authority (outcome, ACs, hard constraints, or settled decisions). Prototype decisions and confirmed interview output feed Think. Wayfinding returns a bounded destination to Think. A standalone factual request uses normal research behavior without engaging the workflow kernel.

### Artifact context

When a lane requires artifact context, load [references/artifacts.md](references/artifacts.md), then resolve and validate `active.md` using the consuming lane's gate. Report `BLOCKED` on invalid status, pointer, identity, lineage, target, or role.

## Named worker dispatch bindings

For worker lanes, dispatch only the configured named worker. Named bindings carry the provider's model, permissions, and wrapper boundary. If a required named worker is unavailable, return `BLOCKED` and name the unavailable binding.

| Dispatch purpose | Worker | Required skill | Mode |
| --- | --- | --- | --- |
| Constructive research | `planner` | `wf-research` | `research` |
| Adversarial research | `planner-adversarial` | `wf-research` | `adversarial` |
| Adjudication | `judge` | `wf-judge` | — |
| Execution planning | `planner` | `wf-planning` | `execution` |
| Adversarial planning | `planner-adversarial` | `wf-planning` | `adversarial` |
| Execution | `operator` | `wf-execution` | — |
| Verification | `verifier` | `wf-verification` | — |
| Standards review | `reviewer` | `wf-review` | `standards-spec` |
| Adversarial review | `reviewer-adversarial` | `wf-review` | `adversarial-risk` |

## Core contract

The conductor owns lane selection, escalation, worker dispatch, artifact writes, and bounded retries. Handle small clear work directly; add workers only when specialization, independent verification, adversarial analysis, or parallel output changes the result.

Subagents return analysis only; judge receives worker outputs only, never raw code or diffs.

### Workspace root

The conductor starts from `$PWD` — canonicalized as the `invocation_dir` (`pwd -P` equivalent) — and resolves the canonical workspace root: the nearest enclosing directory containing `.agent-contexts/` (first-use bootstrap and the multi-repo model: [references/workspace-delegation.md](references/workspace-delegation.md) § Workspace model). The workspace is a working area and need not be a Git worktree. That canonical root is the `workspace_root` passed to every worker. Project artifact lookup — including `.agent-contexts/` — resolves only under that canonical root, with lexical containment (no `..` or absolute-path escape) and resolved-path/symlink containment (the fully resolved real path must stay inside the root). `workspace_root` is not a repository source: every dispatch also carries a declared `repository_root` — an explicitly declared contained repository root, never a scan result — and repository evidence resolves only under it. In a single-repository workspace `repository_root` equals `workspace_root`. Workers must not search `$HOME`, `/`, parent directories, or unrelated roots to discover project artifacts. This restriction does not apply to official documentation URLs, permitted network access, or installed executable/tool paths.

### Dispatch envelope

Every configured worker dispatch — `planner`, `planner-adversarial`, `judge`, `reviewer`, `reviewer-adversarial`, `operator`, and `verifier` (research uses the planner bindings) — carries the minimal dispatch envelope:

- `dispatch_id`
- canonical `workspace_root`
- declared `repository_root` — the canonical root of the explicitly declared contained repository this dispatch targets; it equals `workspace_root` in a single-repository workspace
- `observed_target`

Artifact-consuming dispatches — the read-only workers above and the verifier — additionally carry `inputs`: one compact, complete, ordered list of the declared project inputs. Each input entry names a root-relative path and its expected `work_id`, `artifact_role`, `artifact_id`, and `revision` where applicable. Schema and validation: [references/artifacts.md](references/artifacts.md) § Dispatch inputs.

The first pass sends no artifact bodies. One retry may attach only the matching validated bodies for declared inputs; retry behavior is otherwise unchanged. Workers consume only the declared project inputs; the judge stays supplied-reports-only. The conductor persists every worker report at its canonical path before any dispatch that consumes it, and judges receive only those persisted report paths.

### Dispatch failure

Path, input, transport, and report-envelope errors are `DISPATCH_FAILURE`. A dispatch failure carries no domain, gate, readiness, lineage, acceptance, or revision-budget authority. Persist a conductor diagnostic at `.agent-contexts/work/<work-id>/dispatch/dispatch-<id>-attempt-<n>.md` with `artifact_role: dispatch-diagnostic` and `artifact_id: dispatch-<id>-attempt-<n>`, where `<n>` increments per diagnostic for the same `dispatch_id` — diagnostics are immutable evidence, so the post-retry diagnostic never overwrites the first. Record the shared `dispatch_id`, envelope and provenance, failure class, reason, retry link and ordinal, and timestamps.

Retry once only, before any usable valid report, and only for read-only workers. A second read-only dispatch failure after that inline retry persists a second diagnostic and returns `BLOCKED — DISPATCH_FAILURE`; no report and no enclosing gate advances. Operator and verifier dispatches receive no automatic retry: their dispatch failure is `BLOCKED`, and existing attempt rules remain.

### User blocker classifier

Classify blockers by first match in this precedence:

1. Explicit user-owned decision.
2. Scope or acceptance criteria.
3. Safety, non-functional requirement, privacy, or security boundary.
4. Public-contract semantic change.
5. Publication, abandonment, or workflow exception.
6. Otherwise: implementation mechanics.

Implementation mechanics include local APIs, package signatures and compatibility, naming and file layout, DTOs, and fixture and evidence/test mechanics. Continue automatically through research or planner revision unless supported evidence changes a settled boundary.

### Decision owner authority

The user is the final authority for scope, artifact revision, publication, abandonment, and workflow exceptions. A direct user instruction overrides lifecycle defaults and artifact immutability rules. Before an irreversible or historically confusing change, state its material consequence, then carry out the instruction.

Historical execution evidence remains immutable. The active Brief, Plan, and unexecuted draft remain editable working state. The human classifies an active Plan change as immaterial or material; the conductor may recommend a classification and state its consequence. A user-directed decision change may return the active pointer to the Brief and invalidate old acceptance for changed criteria; it does not erase the historical evidence.

## Routing invariants

- The conductor alone persists durable workflow artifacts. Workers return reports.
- One active human-selected work. The user selects, completes, or abandons work. Flag mismatches; never split, switch, or abandon automatically.
- One governing Plan per slice. The decision pointer stays on it while attempts accumulate.
- One `Operator → Verify → Review` cycle per slice. Accepted slices route back to Plan while Brief ACs remain uncovered.
- Repair only a concrete in-scope failure with safe retry conditions. Route changed scope, acceptance, or safety to Plan, Research, Think, or the user.
- Run the final Brief-wide gate only when accepted slice evidence covers every Brief AC (closed eligibility rule in [references/act.md](references/act.md)).
- `repair-change` returns bounded work to the operator. Classify `replan-required` under the user blocker classifier: route implementation mechanics through research or planner revision, return boundary-changing evidence to Think, and stop only for a genuine user-owned decision. `human-decision-required` stops for the stated decision.

Load [references/act.md](references/act.md) for attempt lifecycle, repair budget, slice acceptance, and final-gate mechanics.

## User-facing behavior

- Lead with the answer and its material caveat.
- Report outcomes, not worker mechanics, unless mechanics explain a blocker.
- Keep responses proportional to the decision the user needs to make.
- Never expose chain-of-thought, scratchpad notes, or tool narration.
