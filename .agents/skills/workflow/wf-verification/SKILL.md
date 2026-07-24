---
name: wf-verification
description: Independently verifies execution-plan evidence and reports bounded PASS, FAIL, INCOMPLETE, or BLOCKED verdicts. Use when verifying a working tree or runtime path.
---

# Workflow Verification

## Mandate

1. Discover the project's verification commands from `package.json` or native tool configuration.
2. Read the Plan's execution-unit contracts and require their declared evidence. Do not replace required checks with guessed or narrower substitutes.
3. Run configured checks in a sensible order, preferring typecheck, then lint, then tests when all three exist. Record command, scope, exit status, and salient output.
4. For browser/runtime, operational, or manual evidence, assess availability and sufficiency. A diff alone is not behavioral, visual, or operational proof.
5. When a Brief exists, assess each acceptance criterion against direct command, runtime, operational, or explicitly approved manual evidence. Mark it `MET`, `UNMET`, or `UNVERIFIED`.
6. Treat source-level performance concerns as potential impact only. A measured performance regression or improvement requires the Plan's declared measurement evidence and its observed result.
7. Do not edit files or repair failures.

## Eligible practice skills

- `browser-testing-with-devtools` when working browser tooling exists and the Plan requires browser/runtime evidence.

Missing required browser, runtime, manual, operational, or external proof is `INCOMPLETE`, never inferred from a diff.

## Output format

```md
## Verification results

### Commands run
- `<command>` — scope: <paths/unit>; exit: <code>; result: <PASS | FAIL | SKIP>; <salient output>

### Typecheck: <PASS | FAIL | SKIP>
<relevant output>

### Lint: <PASS | FAIL | SKIP>
<relevant output>

### Tests: <PASS | FAIL | SKIP>
<relevant output>

### Runtime / Browser: <PASS | FAIL | SKIP>
<relevant output>

### Acceptance Criteria: <MET | UNMET | UNVERIFIED>
- [<MET | UNMET | UNVERIFIED>] <criterion> — <direct evidence, or exact evidence gap and disposition owner>

### Verdict: <PASS | FAIL | INCOMPLETE | BLOCKED>
<one-sentence reason>
```

## Verdict rules

- `PASS`: every required command/evidence item passes and every required acceptance criterion is `MET`.
- `FAIL`: a repairable required check or criterion is `UNMET`; identify a concrete failure signature and repair hypothesis when one exists.
- `INCOMPLETE`: required evidence is unavailable, manual, external, or ambiguous. An `UNVERIFIED` required criterion is `INCOMPLETE`; name the gap and human disposition owner.
- `BLOCKED`: a dependency, precondition, credential, environment, plan conflict, or safety boundary prevents meaningful verification. Do not recommend blind retries.
- A missing configured command is `SKIP`, not `FAIL`.
- No required declared/configured verification yields `INCOMPLETE`, not `PASS`.
- A malformed operator handoff or one that omits required plan evidence yields `INCOMPLETE`.
- A performance acceptance criterion without its required measurement is `INCOMPLETE`; a static code observation cannot satisfy it.
