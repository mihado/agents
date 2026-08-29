---
name: wf-execution
description: Executes settled implementation units with bounded authority and returns concise execution results. Use when applying an approved execution plan.
---

# Workflow Execution

## Process

1. Follow each unit's execution mode, design context, evidence strategy, and safeguards. Apply the Plan's minimum-change selection; before adding a file, export, dependency, fixture, or test, confirm its named obligation remains unique.
2. Use `test-driven-development` for behavior-bearing `code` units with `test-first` evidence. Add only the Plan's minimum evidence: a test proving behavior the changed implementation could regress that no existing test proves. Implement `ui` units against settled design context.
3. For `operation` or `migration` work, verify preconditions and dry-run/idempotency requirements before state changes. Retry partial or non-idempotent work only with observed state and a conductor-approved recovery path.
4. Select triggered supporting skills, record material use, then re-read the Brief and Plan and self-check the final state.

Completion criterion: all approved units are complete, or the operator returns `BLOCKED` or `NEEDS_CONTEXT`. The execution result identifies changed scope, retry safety, and every material supporting skill used.

## Supporting skills

The Plan's suggestions are a starting point. Select only installed skills with a concrete implementation trigger:

- `source-driven-development` — current framework, SDK, service, or upstream facts.
- `test-driven-development` — behavior-bearing code where focused automated proof is feasible.
- `incremental-implementation` — multi-file or high-blast-radius work.
- A settled UI, safety, migration, performance, or debugging skill when the unit's conditions trigger it.
- `browser-testing-with-devtools` — only when working tooling exists and the approved evidence strategy requires browser proof.

Supporting skills implement or strengthen proof within the approved scope. Return `NEEDS_CONTEXT` for a missing decision and `BLOCKED` for an unavailable dependency or unsafe execution condition.

## Execution result

Return this format exactly. Only the verifier issues `PASS`.

```md
## Operator Result
- Status: <COMPLETE | BLOCKED | NEEDS_CONTEXT>
- Units attempted: <U-IDs or names>
- Changed files / operation evidence: <paths, target scope, or no-change reason>
- Supporting skills used: <skill — concrete trigger and effect; `none` only when true>
- Retry safety: <safe to retry | unsafe to retry | not applicable> — <state observed, idempotency, recovery, or reason>
- Blockers: <none, or exact missing decision/dependency/failure>
```

## Boundaries

Stay within Plan scope and declared evidence strategy. Resolve project artifacts, the Brief, Plan, and manifest beneath the conductor-provided canonical `workspace_root`, and repository evidence beneath the declared `repository_root`, each with lexical containment and resolved-path/symlink containment. Official documentation, permitted network access, and installed tools are unaffected. Return `BLOCKED` or `NEEDS_CONTEXT` with the exact gap when the Plan is wrong, underspecified, or contradicted by the repository. For a human-approved Plan, return `NEEDS_CONTEXT` when discovery crosses its `execution_escalation_boundary`; approval does not authorize a scope, acceptance, safety, contract, or evidence change. Return the execution result to the conductor; the conductor writes workflow artifacts.
