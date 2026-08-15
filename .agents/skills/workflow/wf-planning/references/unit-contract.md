# Execution-Unit Contract

Every unit must declare:

```md
### U<N>: <unit name>
**Files / target scope:** <paths, records, service, or environment>
**Depends on:** <none or prior units>
**Execution mode:** code | ui | configuration | operation | migration | documentation
**What to change:** <concrete bounded scope>
**Happy path:** <observable route from input or trigger to accepted outcome>
**Likely failure modes:** <validation, dependency, state, rollback, or user-facing failure behavior; `not applicable` only when true>
**Design context:** <settled interaction, visual, product, or operational decisions; `not applicable` only when true>
**Evidence strategy:** <test-first | characterization | static | browser/runtime | operational | manual>
**Evidence target:** <test, command, browser flow, pre/post measure, or human disposition; for behavior-bearing code, state the lowest adequate level: unit | integration | browser/runtime | operational>
**Evidence safety:** <non-mutating | isolated-stateful | externally-stateful>; for isolated-stateful or externally-stateful, declare target scope, preconditions, cleanup/recovery, and stop conditions
**No-test exception:** <why automated testing is unsuitable; `none` when test-first/characterization applies>
**Operational safeguards:** <dry run, idempotency, rollback/recovery, and stop conditions; `not applicable` only when true>
**Suggested supporting skills:** <triggered skills likely useful to the operator; `none` only when true>
**Escalate when:** <discovery that would change outcome, route, acceptance, non-functional commitment, safety boundary, or required evidence>
**Verification:** <focused and final checks>
**Verification commands:** <exact commands the verifier will run; see format below>
```

### Verification command format

Each command-bearing evidence item must declare the exact command and arguments. Use the classifications from [`workflow/references/command-safety.md`](../../references/command-safety.md):

```md
**Verification commands:**
- `<exact command with arguments>` — safety: <non-mutating | isolated-stateful | externally-stateful>; scope: <target paths or systems>
```

For isolated-stateful or externally-stateful commands, also declare preconditions, cleanup/recovery, and stop conditions. The verifier independently classifies commands and executes only Plan-declared ones.

## Execution-mode vocabulary

- **code:** behavior-changing implementation. Use test-first evidence where feasible; otherwise state a characterization or no-test exception. Name the lowest adequate level: unit for isolated logic, integration for a crossed boundary, browser/runtime for a critical user flow, or operational for a real system boundary.
- **ui:** implementation against settled design context. Browser/runtime evidence covers relevant flow, state, keyboard access, and responsive constraints when tooling exists.
- **configuration:** policy, manifest, or integration configuration. Static validation plus a fresh-load behavioral check when it changes active workflow behavior.
- **operation:** bounded approved runbook work. Require target scope, preconditions, dry run where available, idempotency, recovery, and stop conditions.
- **migration:** data or schema operation. Require operation safeguards plus pre/post state evidence and rollback or explicit irreversibility.
- **documentation:** static content with build/link/lint or explicit human semantic review.

## Readiness gate

If design context, user semantics, security boundaries, data shape, external side effects, or operational safeguards are unsettled, return the unit to Think or research. The Plan suggests methods; it is not an exhaustive implementation recipe.

## Greenfield workspaces

For a greenfield workspace, the first unit establishes the smallest runnable and verifiable skeleton; later units deliver vertical behavior against it. Verification commands in a greenfield Plan are prospective contracts established by the bootstrap unit — cite the Brief or authoritative framework/tool documentation that supports them. The operator creates the corresponding configuration before the verifier runs them.

Never invent existing patterns or `file:line` citations in a greenfield Plan. Record `none — greenfield workspace` for existing patterns and ground claims in the Brief and authoritative sources.
