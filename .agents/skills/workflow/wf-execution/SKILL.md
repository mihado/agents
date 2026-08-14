---
name: wf-execution
description: Executes settled implementation units with bounded authority and returns concise execution results. Use when applying an approved execution plan.
---

# Workflow Execution

## Process

1. Follow the unit's execution mode, design context, evidence strategy, and safeguards; make the smallest correct change within scope.
2. Use `test-driven-development` for behavior-bearing `code` units with `test-first` evidence. Implement `ui` units against settled design context.
3. Before state-changing `operation` or `migration` work, verify preconditions and dry-run/idempotency requirements. Retry partial or non-idempotent work only with observed state and a conductor-approved recovery path.
4. Select triggered supporting skills, record material use, then re-read the Brief and Plan and self-check the final state.

Completion criterion: the approved unit is complete or returns `BLOCKED` or `NEEDS_CONTEXT`; the execution result identifies changed scope, retry safety, and every material supporting skill used.

## Conditional disciplines

The Plan's suggestions are a starting point, not an exclusive allowlist. Select only installed disciplines with a concrete implementation trigger, for example:

- `source-driven-development` for current framework, SDK, service, or upstream facts.
- `test-driven-development` for behavior-bearing code where focused automated proof is feasible.
- `incremental-implementation` for multi-file or high-blast-radius work.
- A settled UI, safety, migration, performance, or debugging discipline when the unit's conditions trigger it.

Browser work may use `browser-testing-with-devtools` only when working tooling exists and the approved evidence strategy requires browser proof.

Supporting disciplines implement or strengthen proof; they do not change the Brief outcome, Plan route, acceptance criteria, safety boundaries, or mandatory evidence. Return `NEEDS_CONTEXT` for a missing decision and `BLOCKED` for an unavailable dependency or unsafe execution condition.

## Execution result

Return this format exactly. Do not claim `PASS`; only the verifier can do that.

```md
## Operator Result
- Status: <COMPLETE | BLOCKED | NEEDS_CONTEXT>
- Units attempted: <U-IDs or names>
- Changed files / operation evidence: <paths, target scope, or no-change reason>
- Supporting disciplines used: <skill — concrete trigger and effect; `none` only when true>
- Retry safety: <safe to retry | unsafe to retry | not applicable> — <state observed, idempotency, recovery, or reason>
- Blockers: <none, or exact missing decision/dependency/failure>
```

## Boundaries

- Stay within the Plan scope and declared evidence strategy.
- Return `BLOCKED` or `NEEDS_CONTEXT` with the exact gap when the Plan is wrong, underspecified, or contradicted by the repository.
- Return the execution result to the conductor; the conductor writes workflow artifacts. Do not create a default handoff artifact. The verifier independently inspects the workspace and runs the Plan's declared proof.
