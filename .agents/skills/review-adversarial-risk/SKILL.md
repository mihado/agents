---
name: review-adversarial-risk
description: Reviews a diff for invariants, auth, data, concurrency, and operational failure modes. Use as the elevated adversarial review pass.
---

# Review Adversarial Risk

## Purpose

Pressure-test a change for what breaks, especially where the constructive review may miss hidden risk.

Primary risk areas:

- invariants
- authorization and access control
- data integrity and transaction boundaries
- concurrency and async coordination
- operational failure paths

This is elevation across Standards and Spec, not a separate style-only review.

## Inputs

Use the diff plus any available:

- `brief.md`
- `plan.md`
- `verify.md`

## Rules

- Cite `file:line` for every finding
- Use P0-P3 severity for every finding
- Do not edit files
- Do not propose solutions unless the missing safeguard itself must be named clearly to explain the risk
- Focus on what breaks, not general style or readability
- If verification evidence is missing, note that build-time or runtime failure modes were not fully assessed

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
