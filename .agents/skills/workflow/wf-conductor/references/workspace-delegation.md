# Workspace Handoffs

Use when a conductor asks a repository conductor to take work.

## Ownership

- The conductor invoked from a root owns only that root's `.agent-contexts/`.
- A workspace conductor may write one request into a declared repository inbox.
- A repository conductor may read its explicitly addressed request and the parent context it names. It never searches upward or writes parent state.
- The repository conductor alone writes its `active.md`, Briefs, Plans, attempts, evidence, and closure.

## Send

1. Write one request at `<repository-root>/.agent-contexts/inbox/<request-id>.md`. Create it once; an existing path blocks the handoff.
2. Record the declared repository, request ID, and user-reported outcome in the workspace tally at `.agent-contexts/delegations.md` when coordination needs tracking.

```md
---
wf-handoff/v1: true
request_id: <stable-kebab-case>
parent_workspace_root: <canonical absolute path>
parent_context_path: <canonical absolute path beneath parent workspace root>
repository_root: <canonical absolute path>
created_at: <ISO-8601 timestamp>
---

# Requested Outcome
<bounded repository outcome>

## Hard Constraints
- <constraint>
```

The request is the handoff. Keep it self-contained; `parent_context_path` is optional read-only detail, never local workflow authority.

## Receive

1. Adopt only a request the user explicitly selects by `<request-id>`.
2. Validate that the request is exactly `<repository-root>/.agent-contexts/inbox/<request-id>.md`, `repository_root` equals the invocation root, and every declared path passes lexical and resolved-path containment beneath its declared root.
3. Read `parent_context_path` only when supplied and validated. If a supplied path is malformed or conflicts with the request, report the gap; do not search parent directories for a substitute.
4. If local work is already active, require the user's decision before replacing it. Otherwise create local work from the request and continue under the normal lifecycle. Recording the request's own path, and its `parent_context_path` if supplied, in the resulting Brief's `source_handoffs` is required, not optional cleanup (see think.md) — this is the only place that reasoning is recoverable from once the request is read.

## Boundary

Inbox requests are handoff context, not workflow artifacts. No cross-root `active.md` writes, artifact adoption, recovery, or status inference.
