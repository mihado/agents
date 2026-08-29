# Recovery

Use for re-orientation, not new planning.

1. Inspect branch, `git status`, recent commits, and current diff.
2. Read `.agent-contexts/active.md`. If absent, malformed, or points outside `.agent-contexts/work/`, report the blocker and stop. If `work_status` is `completed` or `abandoned`, report closure and stop.
3. Resolve `current_artifact_path` to the governing Brief or executable Plan and apply `delivery_mode`. If it is a Brief, require `latest_attempt: null`; otherwise report inconsistent active state and recommend reconciliation before Act. In `autonomous` mode, one unambiguous ready draft is publication and execution authority; continue it without a prompt. In `approval-required` mode, scan `plans/` for drafts belonging to the active Brief and report `ready` drafts as eligible for ordinary publication and `draft` artifacts as work-in-progress; do not treat readiness, recency, or scan order as selection or execution authority. A renamed `plan-<n>.md` is no longer a draft.
4. **Resolve evidence:**
   - When the governing artifact is a Plan, walk backward through its `upstream_artifacts` to collect predecessor Plan IDs. For each Plan in the chain, oldest to newest, check for a Verify with `PASS` and a Review with `no-actionable-findings` bound to the same Plan and attempt. Collect the accepted set: Plan ID, Verify ID, Review ID, and ACs advanced per slice.
   - When the governing artifact is a Brief, report prior Plan and attempt artifacts only as historical activity. Do not infer that they satisfy the current Brief's acceptance criteria or list them as accepted evidence.
   - Use `latest_attempt` only to report the most recent activity — it is informational, not evidence authority.
   - Never infer acceptance from recency alone.
5. When research synthesis exists, compare its decision question with the active Brief. Mark it `STALE` for the next gate if they differ; preserve it unchanged.
6. Separate durable facts from inference. State missing evidence as missing, not as a failed check.

Return:

```md
## Goal
<what we were trying to do>

## In Progress
- <active work, governing artifact, work_status, and delivery_mode>
- <ready drafts with paths, IDs, and revisions, or `no ready drafts`>
- <work-in-progress drafts with paths, IDs, and revisions, or `no work-in-progress drafts`>

## Accepted Evidence
- <accepted slices with Plan IDs, Verify IDs, Review IDs, and ACs advanced — or 'no accepted slices yet'>

## Latest Activity
- <latest_attempt: what happened most recently, regardless of acceptance>

## Drift / Blockers
- <scope drift, blockers, stale artifacts, lineage mismatches, or closed work>

## Next Move
- <single best next step — closure confirmation if all ACs are covered by accepted evidence>
```
