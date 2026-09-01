---
name: wf-conductor
description: Owns conductor workflow control -- lane selection, escalation, artifact authority, recovery, handoffs, and bounded retries. Use when acting as the workflow front door.
---

# Workflow Conductor

## Routing

Every conductor turn starts by reading `active.md` when active work exists. Apply its durable work authority, then apply the current user instruction — which overrides conflicting stored authority — and select the route. Commands are explicit selectors; ordinary language routes through the same model.

When the current instruction changes delivery mode, scope, pause state, or closure state, update `active.md` before dispatching or returning. Before publication, execution, recovery, or successor-slice selection, re-read `active.md` as action authority.

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
| 7 | Bounded workflow-maintenance edit | Direct maintenance route |
| 8 | User supplies a delegated-work path to activate | Load `wf-handoff` Receive, then Think |
| 9 | Settled intent without a Brief | Load [references/think.md](references/think.md) |
| 10 | Settled Brief needing next executable slice | Load [references/plan.md](references/plan.md) |
| 11 | Active Plan + delivery request | Load [references/act.md](references/act.md) |
| 12 | Evidence request against active Plan or result | Load [references/verify.md](references/verify.md) |
| 13 | Critique request or diff inspection | Load [references/review.md](references/review.md) |

A Plan-time Research result returns to Think when it changes Brief authority (outcome, ACs, hard constraints, or settled decisions). Prototype decisions and confirmed interview output feed Think. Wayfinding returns a bounded destination to Think. A standalone factual request uses normal research behavior without engaging the workflow kernel.

### Direct maintenance route

Use this route for a bounded edit to workflow-owned documentation, skills, provider wrappers, or contract tests that does not create or modify a user work package. Read the affected authority and direct consumers once, make the smallest coherent change, run one focused proof plus `git diff --check`, and report the result. Add one adversarial review only when the edit changes routing, authority, safety, or artifact semantics. Do not create Think, Plan, Act, Verify, or workflow artifacts for this route.

Completion criterion: the authoritative contract and every direct consumer agree, and the focused proof passes.

### Artifact context

When a lane requires artifact context, load [references/artifacts.md](references/artifacts.md), then resolve and validate `active.md` using the consuming lane's gate. Report `BLOCKED` on invalid status, pointer, identity, lineage, target, or role.

## Named worker dispatch bindings

For worker lanes, dispatch only the configured named worker. Named bindings carry the provider's model, permissions, and wrapper boundary. If a required named worker is unavailable, return `BLOCKED` and name the unavailable binding.

| Dispatch purpose | Worker | Required skill | Mode |
| --- | --- | --- | --- |
| Constructive research | `planner` | `wf-research` | `research` |
| Adversarial research | `planner-adversarial` | `wf-research` | `adversarial` |
| Adjudication | `judge` | `wf-judge` | — |
| Composite candidate planning | `planner` | `wf-planning` | `candidate` |
| Independent risk candidate | `planner-adversarial` | `wf-planning` | `candidate` |
| Bounded graft revision | `planner` | `wf-planning` | `graft` |
| Execution | `operator` | `wf-execution` | — |
| Verification | `verifier` | `wf-verification` | — |
| Standards review | `reviewer` | `wf-review` | `standards-spec` |
| Adversarial review | `reviewer-adversarial` | `wf-review` | `adversarial-risk` |

## Core contract

The conductor owns lane selection, escalation, worker dispatch, artifact writes, and bounded retries. Handle small clear work directly; add workers only when specialization, independent verification, adversarial analysis, or parallel output changes the result.

Subagents return analysis only; judge receives worker outputs only, never raw code or diffs.

### State and repository roots

The conductor canonicalizes its own `$PWD` as `invocation_dir` for re-orientation. It resolves state only from that directory: `state_root` is the canonical absolute path `<invocation_dir>/.agent-contexts/`. First use creates that directory. Never climb from `invocation_dir` to discover another `.agent-contexts/`; a parent or nested conductor's state is excluded from source evidence. To defer settled work to another repository, load `wf-handoff`; it writes one explicit pending request and never activates target work.

Every conductor filesystem read or write uses a canonical absolute path beneath `state_root`; never pass a relative path to a filesystem tool. Artifact paths may be `invocation_dir`-relative in metadata and dispatch inputs, but they are identifiers, not write targets.

Every dispatch carries `invocation_dir` as its artifact root and one explicit canonical `repository_root` for source, commands, and runtime evidence. `repository_root` may differ from or sit outside `invocation_dir`. Artifact lookup resolves only under `invocation_dir`; repository evidence resolves only under `repository_root`. Both roots use lexical and resolved-path containment for paths beneath them. Workers must not search parent directories or unrelated roots to discover artifacts or source. Official documentation URLs, permitted network access, and installed executable/tool paths are unaffected.

### Dispatch envelope

Every configured worker dispatch — `planner`, `planner-adversarial`, `judge`, `reviewer`, `reviewer-adversarial`, `operator`, and `verifier` (research uses the planner bindings) — carries the minimal dispatch envelope:

- `dispatch_id`
- canonical `invocation_dir`
- declared `repository_root` — the canonical root of the explicitly declared repository this dispatch targets; it may equal `invocation_dir`
- `observed_target`

Artifact-consuming dispatches — the read-only workers above and the verifier — additionally carry `inputs`: one compact, complete, ordered list of the declared project inputs. Each input entry names a root-relative path and its expected `work_id`, `artifact_role`, `artifact_id`, and `revision` where applicable. Schema and validation: [references/artifacts.md](references/artifacts.md) § Dispatch inputs.

The first pass sends no artifact bodies. One retry may attach only the matching validated bodies for declared inputs; retry behavior is otherwise unchanged. Workers consume only the declared project inputs; the judge stays supplied-reports-only. The conductor persists every worker report at its canonical path before any dispatch that consumes it, and judges receive only those persisted report paths.

### Dispatch failure

Path, input, transport, and report-envelope errors are `DISPATCH_FAILURE`. A dispatch failure carries no domain, gate, readiness, lineage, acceptance, or revision-budget authority. Persist a conductor diagnostic at the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/dispatch/dispatch-<id>-attempt-<n>.md` path with `artifact_role: dispatch-diagnostic` and `artifact_id: dispatch-<id>-attempt-<n>`, where `<n>` increments per diagnostic for the same `dispatch_id` — diagnostics are immutable evidence, so the post-retry diagnostic never overwrites the first. Record the shared `dispatch_id`, envelope and provenance, failure class, reason, retry link and ordinal, and timestamps.

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

An instruction to work autonomously, proceed with limited input, or carry work through delivery sets `delivery_mode: autonomous` in `active.md`. That mode authorizes ready Plan publication, Act, and successor slices without another publication prompt. It ends on explicit user pause, mode change, abandonment, or completion.

Autonomous mode changes only that prompt cadence — never the bound on what one slice or one operator dispatch may contain. `plan.md`'s one-focused-Operator-invocation requirement and `act.md`'s per-unit dispatch scoping hold identically in both modes; "autonomous" authorizes moving through slices without asking, not moving through more work per slice.

In `delivery_mode: autonomous`, persist each worker result, re-read `active.md`, route the resulting state, and continue the next authorized lifecycle action. A draft, worker result, ready Plan, accepted slice, or repair result is intermediate state, not a response boundary.

Stop only for an explicit user pause, mode change, abandonment, or closure; a genuine user-owned decision; an unsafe or external block; `BLOCKED — planning loop`; an unavailable required worker; or the required completion confirmation.

Historical execution evidence remains immutable. The active Brief, Plan, and unexecuted draft remain editable working state. The human classifies an active Plan change as immaterial or material; the conductor may recommend a classification and state its consequence. A user-directed decision change may return the active pointer to the Brief and invalidate old acceptance for changed criteria; it does not erase the historical evidence.

## Routing invariants

- The conductor alone persists durable workflow artifacts. Workers return reports.
- One active human-selected work. The user selects, completes, or abandons work. Flag mismatches; never split, switch, or abandon automatically.
- One governing Plan per slice. The decision pointer stays on it while attempts accumulate.
- One `Operator → Verify → Review` cycle per slice. Accepted slices route back to Plan while Brief ACs remain uncovered.
- Repair only a concrete in-scope failure with safe retry conditions. Route changed scope, acceptance, or safety to Plan, Research, Think, or the user.
- Run the final Brief-wide gate only when accepted slice evidence covers every Brief AC (closed eligibility rule in [references/act.md](references/act.md)).
- A Brief created from delegated work records its request and consulted context in `source_contexts`. The link is required and remains on later revisions.
- A conductor reads cross-root context only at an explicit absolute path. Ordinary dispatches never target, need, or reason about another conductor's root.
- `repair-change` returns bounded work to the operator. Classify `replan-required` under the user blocker classifier: route implementation mechanics through research or planner revision, return boundary-changing evidence to Think, and stop only for a genuine user-owned decision. `human-decision-required` stops for the stated decision.

Load [references/act.md](references/act.md) for attempt lifecycle, repair budget, slice acceptance, and final-gate mechanics.

## User-facing behavior

- Lead with the answer and its material caveat.
- Report outcomes, not worker mechanics, unless mechanics explain a blocker.
- Keep responses proportional to the decision the user needs to make.
- Never expose chain-of-thought, scratchpad notes, or tool narration.
