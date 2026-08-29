# Command Safety Taxonomy

Shared reference for planning and verification. Planning declares command intent and required safety context against this taxonomy. Verification independently classifies and authorizes execution using the same vocabulary.

## Classifications

- **Non-mutating**: no I/O beyond the build directory. Examples: `tsc --noEmit`, `eslint`, pure unit tests with mocked I/O. Run without preconditions.
- **Isolated-stateful**: writes to local databases, temp state, or fixtures that are automatically cleaned up. Examples: integration tests with local fixtures, browser tests against a dev server. Run when the Plan declares target scope and cleanup is automatic or handled by test fixtures.
- **Externally-stateful**: uses credentials, mutates external systems, touches production-like state, or has side effects beyond the local machine. Examples: operational checks, migration verification, external service calls. Run only when the Plan provides target scope, authorization, preconditions, cleanup/recovery, and stop conditions.

## Escalation signals

The following force at minimum **isolated-stateful** classification regardless of declared intent:

- Shell composition (`&&`, `||`, `;`, pipes)
- Redirection or command substitution
- Credential use (env vars, secrets, tokens)
- Network access to non-localhost
- Database connections
- Migration execution
- Destructive flags (`--force`, `--drop`, `--reset`, `rm -rf`)

## Planning responsibility

Each Plan declares exact verification commands with:
- The exact command and arguments
- Safety classification from this taxonomy
- Target scope (paths or systems affected)
- For isolated-stateful or externally-stateful: owned state, ownership marker, preconditions, cleanup/recovery, and stop conditions

A test environment file or Compose override is owned when the Plan declares it as a fixture or the user explicitly directs the named test artifact. Its ownership marker is its fixture declaration or the recorded user direction; it need not have been created by the current attempt. A process is owned when the current attempt started it and identifies it through a PID, container ID, fixture ID, or another exact marker. Ambiguous state is external until the Plan or user establishes ownership.

## Verification responsibility

The verifier independently classifies each declared command by its actual capabilities:
- If the independent classification is more restrictive than the Plan's declaration, use the more restrictive classification.
- If the Plan omits required safety context for the applicable classification, report `INCOMPLETE`.
- Discovered configured commands absent from the Plan and materially applicable to Plan scope: report `INCOMPLETE` (Plan defect).
- The verifier does not execute discovered-but-undeclared commands.
- For stateful commands, record preflight and cleanup outcomes in the verification result.
