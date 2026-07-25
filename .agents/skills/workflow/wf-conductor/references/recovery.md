# Recovery Branch

Use for re-orientation, not new planning.

1. Inspect branch, `git status`, recent commits, and current diff.
2. Read `.agent-contexts/active.md`, then resolve the selected work-local Brief, current Plan, research synthesis, execution evidence, and review report.
3. When research synthesis exists, compare its decision question with the active Brief. Mark it `STALE` for the next gate if they differ; preserve it unchanged.
4. If `active.md` is absent, malformed, or points outside `.agent-contexts/work/`, report the blocker and do not infer an active work.
5. Separate durable facts from inference.
6. Do not write a workflow artifact by default.

Return:

```md
## Goal
<what we were trying to do>

## In Progress
- <active work>

## Evidence State
- <latest verify/review/artifact state>

## Drift / Blockers
- <scope drift, blockers, or stale artifacts>

## Next Move
- <single best next step>
```

If evidence is missing, say it is missing. Do not present absent verification as a failed check.
