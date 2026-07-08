---
name: recovery-orientation
description: Reconstructs working context after context decay. Use when the user asks what we were doing, what changed, what is in progress, or what the next move should be.
---

# Recovery Orientation

## Purpose

Rebuild working context from durable evidence instead of guessing from chat memory.

Use this when the user's real need is re-orientation rather than fresh planning.

Examples:

- "where are we"
- "catch me up"
- "what did we do"
- "what's in flight"
- "what was the plan"

## Inputs

Inspect, when available:

- current branch
- `git status`
- recent commits
- current diff
- `.agent-contexts/brief.md`
- `.agent-contexts/plan.md`
- `.agent-contexts/verify.md`
- `.agent-contexts/review.md`

Treat durable artifacts and repo state as canonical. Treat model memory as a cache.

## Rules

- Do not start planning new work by default
- Do not write a new artifact by default
- Distinguish observed facts from inference
- Surface only actionable state, not internal orchestration chatter
- Prefer the single best next move over a long menu of options

## Output Format

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

## Quality bar

- If no durable artifacts exist, say so plainly
- If the goal is inferred from branch name or changed files, say it is inferred
- If verification evidence is missing, call that out as missing evidence, not as a failed check
