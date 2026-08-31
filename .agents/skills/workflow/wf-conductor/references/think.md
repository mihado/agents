# Think

Think writes a Brief when intent is settled. When intent, behavior, or scope is unresolved, the conductor loads the appropriate method first (see the routing precedence table in SKILL.md).

Think accepts inputs from:
- Direct settled requests (no prior discovery needed).
- Interview output (confirmed intent statement).
- Prototype output (recorded design decision).
- Research disposition (adopted synthesis recorded in a superseding Brief).
- Wayfinding output (bounded destination from a resolved frontier).
- Handoff adoption (an accepted inbox request; see workspace-delegation.md).

For `/think`:

1. Read task context and any discovery output. If empty, route to discovery instead.
2. Apply fact-versus-decision discipline. Verify that outcome, constraints, acceptance criteria, and decision owner are settled.
3. If a bounded factual question must be answered to settle the Brief (e.g. API constraints, platform capabilities, rate limits), invoke `wf-research`. Persist evidence under the active work. Resume Think with the result. If the result makes the intended outcome incoherent, return to the user.
3. When writing the first durable artifact for a user-selected work, choose a readable lowercase kebab-case `work_id` and create `.agent-contexts/work/<work-id>/`. On collision, append the smallest available numeric suffix.
4. Write `.agent-contexts/work/<work-id>/brief-01.md` only when intent, constraints, and acceptance are settled. Use the Brief frontmatter template below. When the Brief adopts a handoff or cites parent context, `source_handoffs` is required, not optional: add an entry for the handoff and, if `parent_context_path` was supplied, one for it.
5. After the Brief is persisted, publish `.agent-contexts/active.md` pointing to it (`current_artifact_path: work/<work-id>/brief-<n>.md`, `current_artifact_id: brief-<n>`) with `delivery_mode: autonomous` when the user has given autonomous-delivery authority; otherwise use `delivery_mode: approval-required`.
6. When risk or ambiguity is high, deepen the direct interview rather than dispatching workers.

## Active Brief revision

When the user explicitly directs a revision to the active Brief, revise it in place even when prior execution evidence exists. Before rewriting a historically evidenced Brief, state that prior Plan, Verify, and Review artifacts remain immutable historical evidence and that changed acceptance criteria are no longer satisfied by that evidence unless the user explicitly reaffirms them.

After revising the active Brief:

1. Update `revised_at` and `revision_summary` in its frontmatter.
2. Keep `active.md` pointed at the revised Brief and set `latest_attempt: null`.
3. Preserve prior Plan and attempt artifacts unchanged; Recovery reports them as historical activity, not current execution.
4. Return to Plan before further Act. Do not require a superseding Brief, publication ceremony, or new work ID solely because the decision owner revised the current Brief.

Use a superseding Brief when new research or normal workflow progression calls for a distinct durable decision record. A direct user rewrite is an explicit exception to that default.

### Brief frontmatter template

```yaml
---
wf-artifact/v1: true
work_id: <work-id>
artifact_role: brief
artifact_id: brief-<n>
upstream_artifacts: []
observed_target: <branch:ref, head:sha-prefix, worktree:clean|dirty>
created_at: <ISO-8601 timestamp>
---
```

### Source handoffs

`source_handoffs` is required whenever the Brief adopts a handoff or cites a `parent_context_path`; it is absent only when no such origin exists — never omitted merely because recording it feels like overhead. It is the durable link back to the reasoning behind the Brief: without it, that reasoning is unrecoverable the moment the source document moves, is archived, or is simply forgotten about. Each entry:

```yaml
source_handoffs:
  - path: <path to the adopted handoff>
    role: handoff
  - path: <path named by parent_context_path, if supplied>
    role: parent-context
```

`path` is a file path today because that is the only provenance backend Think has. When a non-file source exists — a Linear issue, a GitHub issue, a system not yet built — reuse this same key for that locator (URL, issue ID) rather than adding a parallel field; `source_handoffs` names an origin, not specifically a filesystem location. `role` is a short free-text label for what the entry is; add further entries the same way for any other consulted document worth recovering.

Before writing the Brief, confirm each entry's path resolves under its declared root, the same containment check applied to dispatch inputs; report a gap rather than persist an unresolvable reference. This is provenance, not delegated authority — the cited material informs Think but does not itself settle outcome, ACs, or constraints, and no dispatch consumes it as a project input. But it is not decorative: a required entry that is missing or unresolvable is a defect in the Brief, not an accepted variant. Populate it once, at Brief creation; do not maintain it across later revisions.

### Brief body template

```md
## Outcome
<stable user-visible result>

## Acceptance Criteria
- AC1: <observable, independently assessable criterion>
- AC2: <observable, independently assessable criterion>

## Hard Constraints
- <constraint>

## Safety and Non-Functional Commitments
- <security, performance, accessibility, compatibility, or operational requirement>

## Settled Decisions
- <route-defining decision and rationale>

## Non-Goals
- <explicitly excluded scope>

## Decision Owner
<who resolves remaining human-owned decisions>
```

Acceptance criteria use stable `AC<n>` IDs. Slice Plans reference these IDs to declare which criteria they advance. The Brief remains stable and does not track implementation progress.

### AC identity rules

- Each AC uses the form `AC<n>` where `<n>` is a unique positive integer within the Brief (e.g. `AC1`, `AC2`, `AC3`).
- IDs must be unique — no two criteria share the same ID within a Brief.
- Every Plan `## Brief Coverage` must reference only AC IDs that exist in the governing Brief. A reference to a nonexistent AC ID is a Plan defect.
- ACs that cannot be meaningfully assessed within a single slice are designated `[cumulative-only]` in the Brief. They must declare their required final evidence:

```md
- AC4 [cumulative-only]: The system supports 1000 concurrent users.
  Final evidence: load test against the complete runtime with defined latency and error-rate thresholds.
```

- `cumulative-only` must not be used to defer evidence for criteria assessable within a slice. Planning rejects the designation when the criterion can be demonstrated by a single slice's behavior.

### AC semantics across supersession

- Superseding Briefs preserve existing AC IDs with their original semantics. A changed meaning requires a new ID and explicit deprecation of the old one.
- Superseding Briefs may append new AC IDs (continuing the numbering).
- Removing an AC requires explicit non-goal declaration and a `supersession_reason` that names it.

For superseding Briefs (`brief-02`, `brief-03`, ...): set `upstream_artifacts` to the prior brief ID and any adopted research synthesis IDs. Add `supersedes: brief-<prev>` and `supersession_reason: <what changed>`.

Return:

```md
## Think Complete
- Brief written to `.agent-contexts/work/<work-id>/brief-01.md`
- Next: run `/plan`
```
