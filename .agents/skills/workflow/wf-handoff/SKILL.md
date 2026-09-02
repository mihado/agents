---
name: wf-handoff
description: Delegates settled root-conductor intent to a repository conductor without activating its work. Use when work belongs in another repository and the repository conductor will be invoked later.
---

# Workflow Handoff

## Send

1. Canonicalize the sender's `$PWD` as `invocation_dir`. Write the sender tally only at the absolute `<invocation_dir>/.agent-contexts/delegations.md` path.
2. Require an explicit absolute `target_invocation_dir`, `repository_root`, non-empty `context_paths`, and stable `work_id`. `target_invocation_dir` equals `repository_root`; it is where the repository conductor must be invoked. Read every declared context path exactly as written; never discover, rewrite, or resolve another context path. The request is a complete transferable Brief: it carries the settled intent, decisions, acceptance, constraints, scope, and evidence expectations. Context paths support that record rather than replacing it.
3. Require `<target_invocation_dir>/.agent-contexts/work/<work-id>/` to be absent, then write the request at the absolute `<target_invocation_dir>/.agent-contexts/work/<work-id>/delegated-01.md` path. A target work-directory collision blocks the handoff. Do not write `<target_invocation_dir>/.agent-contexts/active.md`.
4. Add or update one row in the sender's tally. The tally records the declared request path and last observed status; it does not govern repository work.

```md
---
wf-artifact/v1: true
work_id: <stable-kebab-case>
artifact_role: delegated-work
artifact_id: delegated-01
upstream_artifacts: []
repository_root: <absolute path>
target_invocation_dir: <absolute path; equals repository_root>
context_paths:
  - <absolute path to root Brief, research, decision, or relevant repository document>
created_at: <ISO-8601 timestamp>
status: pending
---

# Requested Outcome
<bounded repository outcome>

## Why Now
<problem, user, or repository condition this work addresses>

## Acceptance Criteria
- <observable criterion>

## Hard Constraints
- <constraint>

## Settled Decisions
- <decision the repository conductor must preserve>

## Repository Scope
- In scope: <components, paths, or behavior>
- Out of scope: <explicit exclusion>

## Expected Evidence
- <test, command, runtime flow, or explicit reason evidence is deferred>

## Context
- <absolute context path> — <what it establishes for this work>
```

```md
| Work | Request path | Status observed | Last checked |
| --- | --- | --- | --- |
| <work-id> | <absolute request path> | pending | <ISO-8601 timestamp> |
```

Completion: the request and tally row exist at their declared absolute paths; the target repository's `active.md` is unchanged.

## Receive

Only when the user instructs the repository conductor to take a supplied absolute delegated-work path:

1. Read that exact absolute path. Its text must equal `<invocation_dir>/.agent-contexts/work/<work-id>/delegated-01.md`, declare `target_invocation_dir: <invocation_dir>` and the invocation's `repository_root`, and have `status: pending`. A new activation has no sibling `brief-01.md` or lifecycle evidence. A retry may have only `brief-01.md`: verify its `source_contexts` names this request and it has no active pointer or lifecycle evidence, then resume at step 3. Any other sibling artifact blocks activation.
2. Read each declared absolute context path exactly as written. Context informs the local Brief; it never grants lifecycle authority.
3. If local work is active, require the user's selection before changing it. Otherwise create the local Brief by preserving the request's outcome, acceptance criteria, hard constraints, settled decisions, repository scope, and expected evidence; record the request and consulted context paths in `source_contexts`; update only this conductor's absolute `active.md` path; then write `status: activated` and `activated_at` into the request. A failed activation before that final write leaves no activated request.

Completion: the repository's active work points to its local Brief, which preserves the request's governing intent; the request records its activation.

## Boundary

The sender creates a pending work item. The repository conductor activates work only on direct user instruction. It plans and implements the transferred intent; it rethinks that intent only on explicit user direction or evidence from a blocked or failed implementation path. Each conductor writes only the state it owns, except the sender's one delegated-work request at the declared target path.
