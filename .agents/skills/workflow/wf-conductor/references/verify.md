# Verify Branch

Resolve `active.md`, select the relevant execution attempt or declared evidence scope, then dispatch the configured `verifier` with `Required skill: wf-verification`. Write `.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md` with metadata binding it to the Brief, Plan, attempt, observed target, and verified evidence scope. Do not present a prior attempt's verdict as proof for a materially different Plan, attempt, or diff.

```md
## Verify Complete
- Verdict: <PASS | FAIL | INCOMPLETE | BLOCKED>
- Evidence saved to `.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md`
```
