---
name: review-adversarial-risk
description: Reviews a diff for invariants, auth, data, concurrency, and operational failure modes. Use as the elevated adversarial review pass.
---

# Review Adversarial Risk

## Overview

Pressure-test a change for what breaks, especially where the constructive review may miss hidden risk.

Primary risk areas:

- invariants
- authorization and access control
- data integrity and transaction boundaries
- concurrency and async coordination
- operational failure paths

This is elevation across Standards and Spec, not a separate style-only review.

## Process

### Step 1: Read the risk surface

Use the diff plus any available:

- `brief.md`
- `plan.md`
- `verify.md`

Inspect surrounding local code only as needed to explain a concrete risk.

Completion criterion: you know what changed, what assumptions the change claims, and what verification evidence exists.

### Step 2: Pressure-test the risk axes

Check, at minimum:

- invariants
- authorization and access control
- data integrity and transaction boundaries
- concurrency and async coordination
- operational failure paths

Completion criterion: every credible hidden-risk issue worth surfacing has been classified by severity and cited to `file:line`.

### Step 3: Return only credible breakage

Do not pad the review with generic warnings or style concerns.

Completion criterion: every reported issue names a concrete failure mode that could plausibly happen in this change.

## Rules

- Cite `file:line` for every finding
- Use P0-P3 severity for every finding
- Do not edit files
- Do not propose solutions unless the missing safeguard itself must be named clearly to explain the risk
- Focus on what breaks, not general style or readability
- If verification evidence is missing, note that build-time or runtime failure modes were not fully assessed
- Do not run build, test, lint, or verification commands
- Review changed files first
- Inspect only directly related local application code needed to explain a finding
- Do not inspect `node_modules`, generated files, vendor code, or unrelated framework internals
- Do not create helper scripts, temporary files, or ad hoc tooling
- Prefer direct file/code inspection over broad exploratory searching

## Severity

```text
P0 — Critical breakage, exploitable vulnerability, data loss/corruption. Must fix before merge.
P1 — High-impact defect likely hit in normal usage, breaking contract. Should fix.
P2 — Moderate issue with meaningful downside. Fix if straightforward.
P3 — Low-impact, narrow scope, minor improvement. User's discretion.
```

## Output Format

For each finding:

```md
**P<N>** — `<file>:<line>`
<what breaks and why>
```

If no findings:

```md
No adversarial concerns found. The invariants appear to hold, and the change introduces no new auth, data, or concurrency risks.
```
