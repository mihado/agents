# Act Branch

1. Read `plan.md` and available Brief; if no plan exists, return the user to Plan.
2. Dispatch `operator` with `Required skill: wf-execution`, the settled plan, Brief, and prior verifier evidence.
3. Dispatch `verifier` with `Required skill: wf-verification`, plan evidence profile, and Operator Handoff.
4. Write verifier output to `.agent-contexts/verify.md`.
5. On `PASS`, return completion. On `FAIL`, retry only with a concrete repair hypothesis and safe retry handoff. Never retry unchanged diffs, repeated signatures, partial/non-idempotent operations, plan defects, or environment failures.
6. Escalate model after two safe retries without evidence progress. Stop after three consecutive repairable failures.
7. On `INCOMPLETE` or `BLOCKED`, stop and name the missing human disposition or boundary.

Return one of:

```md
## Act Complete
- Operator applied the execution plan
- Verification: PASS
- Evidence saved to `.agent-contexts/verify.md`
```

```md
## Act Blocked
- Verification: <FAIL | BLOCKED>
- Evidence saved to `.agent-contexts/verify.md`
- Blocker: <short reason>
```

```md
## Act Incomplete
- Verification: INCOMPLETE
- Evidence saved to `.agent-contexts/verify.md`
- Required disposition: <missing evidence and human owner>
```
