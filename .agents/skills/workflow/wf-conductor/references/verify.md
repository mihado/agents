# Verify

Standalone `/verify` follows the same safety gate and attempt model as Act.

## Plan gate

1. Resolve the absolute `<invocation_dir>/.agent-contexts/active.md` path. Require `current_artifact_path` pointing to an artifact with `artifact_role: plan` and `readiness: implementation-ready|human-approved`. A human-approved Plan must include its `approval` record. Without an executable Plan, return `BLOCKED — no Plan gate` before dispatch.

## Attempt creation

2. Always create a fresh absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/` directory (incrementing from the highest existing attempt). Update the absolute `<invocation_dir>/.agent-contexts/active.md` frontmatter `latest_attempt` to the invocation-relative identifier (e.g. `work/<work-id>/execution/attempt-<n>`). This is a verification-only attempt — no operator.md will exist; the verification artifact uses `verification_mode: standalone` in its lineage.

## Dispatch

3. Dispatch the configured `verifier` with `Required skill: wf-verification`, `Mode: slice`, the dispatch envelope, and validated ordered declared inputs — the Brief and Plan, plus any operator result or evidence artifact this flow supplies — and the Plan evidence profile (including evidence-safety classifications and exact verification commands). Validate every supplied project artifact under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity).
4. Write the result to the absolute `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md` path with metadata binding it to the Brief, Plan, attempt, observed target, and verified evidence scope. Use the standalone lineage form (upstream includes Plan only, plus `verification_mode: standalone`).

The verifier receives no automatic retry: a verifier `DISPATCH_FAILURE` is `BLOCKED` under the dispatch-failure contract in [SKILL.md](../SKILL.md), and the attempt rules above apply.

Without classified evidence commands in the Plan, the verifier will return `INCOMPLETE` for any stateful checks.

A prior attempt's verdict is not proof for a materially different Plan, attempt, or diff.

```md
## Verify Complete
- Verdict: <PASS | FAIL | INCOMPLETE | BLOCKED>
- Evidence saved to `<invocation_dir>/.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md`
```
