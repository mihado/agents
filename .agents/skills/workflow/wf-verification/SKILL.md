---
name: wf-verification
description: Independently verifies execution-plan evidence and reports bounded PASS, FAIL, INCOMPLETE, or BLOCKED verdicts. Use when verifying a working tree or runtime path.
---

# Workflow Verification

## Verification mode

The conductor specifies the verification mode when dispatching:

- **slice**: assess only the current Plan's declared evidence and Brief AC IDs with status `advanced` in the Plan's `## Brief Coverage`. ACs with status `out-of-slice`, `already-met`, or `cumulative-only` are not assessed. Also check for regressions materially applicable to the slice scope. Command authority comes from the current slice Plan.
- **final**: assess every Brief AC ID using the declared Brief and the cumulative evidence manifest supplied by the conductor. The Brief supplies full AC bodies and contracts. Command authority comes from the manifest's `cumulative_commands` (the union of all accepted slice Plans' declared commands). The manifest also supplies the diff base, accepted slice references, and the complete AC list including `cumulative-only` criteria.

If no mode is specified, default to `slice`.

## Workspace root

Resolve project artifacts, the Plan/Brief/manifest, only beneath the conductor-provided canonical `workspace_root`, and repository evidence only beneath the declared `repository_root` — each with lexical containment and resolved-path/symlink containment. Consume only conductor-declared inputs whose expected identity matches [the dispatch-input validation](../wf-conductor/references/artifacts.md#dispatch-inputs). Official documentation, permitted network access, and installed tools are unaffected.

## Mandate

### Slice mode

1. Discover the project's configured verification commands from `package.json` or native tool configuration.
2. Read the current Plan's execution-unit contracts and their exact declared verification commands.
3. Compare discovered commands with Plan-declared commands. Report material omissions (configured commands materially applicable to the Plan's scope but absent from the Plan) as `INCOMPLETE` due to a Plan defect.
4. Independently classify each Plan-declared command (see Command safety below).
5. Execute only Plan-declared commands whose safety context is sufficient. Run them in order: typecheck, then lint, then tests when applicable. Record command, scope, exit status, and salient output.
6. For browser/runtime, operational, or manual evidence, assess availability and sufficiency. A diff alone is not behavioral, visual, or operational proof.
7. Assess only AC IDs with status `advanced` in the Plan's Brief Coverage. Mark each `MET`, `UNMET`, or `UNVERIFIED`. ACs with status `out-of-slice`, `already-met`, or `cumulative-only` are not reported.
8. Treat source-level performance concerns as potential impact only. A measured regression requires the Plan's declared measurement evidence and its observed result.

### Final mode

1. Read the declared Brief and the cumulative evidence manifest supplied by the conductor.
2. Discover configured verification commands. Compare with the manifest's `cumulative_commands`. Report material omissions as `INCOMPLETE`.
3. Independently classify each manifest command (see Command safety below).
4. Execute only manifest commands whose safety context is sufficient. Run all cumulative commands in order.
5. Assess every Brief AC ID (both normal and `cumulative-only`). For normal ACs, re-verify against the current cumulative state — prior slice evidence is not permanently valid after integration. For `cumulative-only` ACs, execute their declared final evidence contract.
6. Mark each AC `MET`, `UNMET`, or `UNVERIFIED`.
Source-read-only: report findings only. Do not edit source files, execute undeclared commands, or run repairs.

Completion criterion: every command in the active authority (Plan or manifest) is assessed; every in-scope AC is assessed with a concrete verdict and supporting command output or explicit evidence gap.

## Command safety

Load [`workflow/references/command-safety.md`](../references/command-safety.md) for the full taxonomy, escalation signals, and classification rules.

In both modes, commands come from a declared authority (slice Plan or cumulative manifest). Independently classify each command by its actual capabilities — the Plan's label is context, not authority. Use the more restrictive classification when they differ. Report `INCOMPLETE` when required safety context is missing.

## Eligible practice skill

`browser-testing-with-devtools` when working browser tooling exists and the Plan requires browser/runtime evidence.

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

- **PASS:** every required command/evidence item passes and every in-scope acceptance criterion is `MET`.
- **FAIL:** a repairable required check or criterion is `UNMET`. Identify a concrete failure signature and repair hypothesis when one exists.
- **INCOMPLETE:** required evidence is unavailable, manual, external, or ambiguous. An `UNVERIFIED` required criterion is `INCOMPLETE`; name the gap and human disposition owner. A configured command materially applicable to the Plan's scope but omitted from the Plan is `INCOMPLETE` (Plan defect).
- **BLOCKED:** a dependency, precondition, credential, environment, plan conflict, or safety boundary prevents meaningful verification. A Plan-declared command unavailable in the current environment is `BLOCKED`.
- No required declared/configured verification yields `INCOMPLETE`, not `PASS`.
- A performance criterion without its declared measurement is `INCOMPLETE`; static observation cannot satisfy it.

**Per-command result:** `SKIP` indicates an inapplicable command category (e.g. no lint configured, no tests in scope). A skipped command does not contribute to the verdict in either direction.
