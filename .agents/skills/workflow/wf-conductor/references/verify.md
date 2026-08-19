# Verify

Standalone `/verify` follows the same safety gate and attempt model as Act.

## Plan gate

1. Resolve `active.md`. Require `current_artifact_path` pointing to an artifact with `artifact_role: plan` and `readiness: implementation-ready|human-approved`. A human-approved Plan must include its `approval` record. Without an executable Plan, return `BLOCKED — no Plan gate` before dispatch.

## Attempt creation

2. Always create a fresh `execution/attempt-<n>/` (incrementing from the highest existing attempt). Update `active.md` frontmatter `latest_attempt` to the full `.agent-contexts/`-relative path (e.g. `work/<work-id>/execution/attempt-<n>`). This is a verification-only attempt — no operator.md will exist; the verification artifact uses `verification_mode: standalone` in its lineage.

## Dispatch

3. Dispatch the configured `verifier` with `Required skill: wf-verification`, `Mode: slice`, the Brief, Plan, current workspace, and Plan evidence profile (including evidence-safety classifications and exact verification commands).
4. Write the result to `execution/attempt-<n>/verify.md` with metadata binding it to the Brief, Plan, attempt, observed target, and verified evidence scope. Use the standalone lineage form (upstream includes Plan only, plus `verification_mode: standalone`).

Without classified evidence commands in the Plan, the verifier will return `INCOMPLETE` for any stateful checks.

A prior attempt's verdict is not proof for a materially different Plan, attempt, or diff.

```md
## Verify Complete
- Verdict: <PASS | FAIL | INCOMPLETE | BLOCKED>
- Evidence saved to `.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md`
```
