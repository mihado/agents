# Recovery

Use for re-orientation, not new planning.

1. Inspect branch, `git status`, recent commits, and current diff.
2. Read `.agent-contexts/active.md`. If absent, malformed, or points outside `.agent-contexts/work/`, report the blocker and stop. If `work_status` is `completed` or `abandoned`, report closure and stop.
3. Resolve `current_artifact_path` to the governing decision-point artifact (Brief, synthesis, or Plan).
4. **Resolve accepted evidence by walking predecessor lineage:**
   - The governing Plan is the one `active.md` points to (the newest).
   - Walk *backward* through its `upstream_artifacts` to collect predecessor Plan IDs.
   - For each Plan in the chain (oldest to newest), check whether accepted slice evidence exists: a Verify with PASS and a Review with `no-actionable-findings` both bound to that Plan and attempt.
   - Collect the accepted set: Plan ID, Verify ID, Review ID, and ACs advanced per slice.
   - Use `latest_attempt` only to report the most recent activity — it is informational, not evidence authority.
   - Never infer acceptance from recency alone.
5. When research synthesis exists, compare its decision question with the active Brief. Mark it `STALE` for the next gate if they differ; preserve it unchanged.
6. Separate durable facts from inference. State missing evidence as missing, not as a failed check.

Return:

```md
## Goal
<what we were trying to do>

## In Progress
- <active work, governing artifact, and work_status>

## Accepted Evidence
- <accepted slices with Plan IDs, Verify IDs, Review IDs, and ACs advanced — or 'no accepted slices yet'>

## Latest Activity
- <latest_attempt: what happened most recently, regardless of acceptance>

## Drift / Blockers
- <scope drift, blockers, stale artifacts, lineage mismatches, or closed work>

## Next Move
- <single best next step — closure confirmation if all ACs are covered by accepted evidence>
```
