---
name: review-standards-spec
description: Reviews a diff against Standards and Spec. Use for constructive review focused on correctness, regressions, conventions, and conformance to the Brief and Plan.
---

# Review Standards Spec

## Overview

Review a change along two primary axes:

- Standards: correctness, regressions, repo conventions, and Fowler smell baseline when repo standards are silent
- Spec: whether the change matches the Brief, Plan, or stated scope

This is a constructive review, not an implementation pass.

## Process

### Step 1: Read the review surface

Use the diff plus any available:

- `brief.md`
- `plan.md`
- `verify.md`

Completion criterion: you know what changed and what stated scope or evidence exists.

### Step 2: Review on the Standards axis

Check correctness, regressions, repo conventions, and Fowler smell baseline when repo standards are silent.

Completion criterion: every standards issue worth surfacing has been classified by severity and cited to `file:line`.

### Step 3: Review on the Spec axis

Check whether the change matches the Brief, Plan, or stated scope.

Completion criterion: every scope or conformance issue worth surfacing has been classified by severity and cited to `file:line`.

### Step 4: Return only findings that matter

Do not pad the review with praise, summaries, or speculative cleanup.

Completion criterion: every reported issue is concrete, actionable, and worth the reader's attention.

## Rules

- Cite `file:line` for every finding
- Use P0-P3 severity for every finding
- Do not edit files
- Do not propose refactors unless the issue is itself the finding
- If verification evidence is missing, note the gap explicitly
- Keep Standards and Spec findings separate so one does not mask the other
- Do not run build, test, lint, or verification commands

## Severity

```text
P0 — Critical breakage, exploitable vulnerability, data loss/corruption. Must fix before merge.
P1 — High-impact defect likely hit in normal usage, breaking contract. Should fix.
P2 — Moderate issue with meaningful downside. Fix if straightforward.
P3 — Low-impact, narrow scope, minor improvement. User's discretion.
```

## Output Format

```md
## Standards
<findings or "No standards issues found.">

## Spec
<findings or "No spec-conformance issues found.">
```

For each finding:

```md
**P<N>** — `<file>:<line>`
<what is wrong and why>
```

If no findings at all:

```md
No review issues found.
```
