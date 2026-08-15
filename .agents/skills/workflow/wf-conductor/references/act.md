# Act Branch

1. Resolve `active.md` by parsing its frontmatter `current_artifact_path` — read the artifact at that exact path. Before Act, require `artifact_role: plan`, `readiness: implementation-ready`, and a matching settled `brief_id` and upstream research identities. If the route decision is unsettled, load `references/plan.md` to select Research or Think; if the route is settled but unit detail is incomplete, return to Plan; if the pointer or required metadata is malformed or mismatched, return `BLOCKED — Plan gate` and name the failed field. Start `execution/attempt-<n>/` for each operator, Verify, and Review cycle; never overwrite a prior attempt.
2. Dispatch the configured `operator` with `Required skill: wf-execution`, the settled Plan, Brief, and the concrete prior verifier or review finding when repairing. The operator returns a concise session result to the conductor; do not write `handoff.md` by default.
3. Dispatch the configured `verifier` with `Required skill: wf-verification`, the Brief, Plan, current workspace, and Plan evidence profile. Write its independent result to `.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md` with metadata binding it to the Brief, Plan, attempt, observed target, and evidence scope.
4. On verifier `PASS`, dispatch Review against the same attempt. On verifier `FAIL`, return a repair only with a concrete repair hypothesis, safe retry state, and evidence progress. Never retry unchanged diffs, repeated signatures, partial/non-idempotent operations, Plan defects, or environment failures.
5. On review `no-actionable-findings`, complete. On `repair-in-scope`, return the bounded finding to Operator, then Verify again and Review again when the reviewed scope changed. On `replan-required` or `human-decision-required`, stop for the stated disposition.
6. Count verifier and review repairs in one shared budget. Escalate to the user after two repairs without evidence progress. Stop after three safe repair cycles. `INCOMPLETE`, `BLOCKED`, repeated signatures, unsafe retries, or material scope drift stop for human disposition.

Return one of:

```md
## Act and Review Complete
- Operator applied the execution plan
- Verification: PASS
- Review: no actionable findings
- Evidence saved to `.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md`
- Review saved to `.agent-contexts/work/<work-id>/execution/attempt-<n>/review.md`
```

```md
## Act Blocked
- Gate: <Verify | Review>
- Status: <FAIL | BLOCKED | replan-required | human-decision-required>
- Evidence saved to `.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md`
- Blocker: <short reason>
```

```md
## Act Incomplete
- Verification: INCOMPLETE
- Evidence saved to `.agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md`
- Required disposition: <missing evidence and human owner>
```
