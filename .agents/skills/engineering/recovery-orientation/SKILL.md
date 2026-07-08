---
name: recovery-orientation
description: Reconstructs working context after context decay. Use when the user asks what we were doing, what changed, what is in progress, or what the next move should be.
---

# Recovery Orientation

## Overview

Rebuild working context from durable evidence instead of chat memory.

Use this when the user's real need is re-orientation, not fresh planning.

Examples:

- "where are we"
- "catch me up"
- "what did we do"
- "what's in flight"
- "what was the plan"

## Process

### Step 1: Rebuild from durable evidence

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

Completion criterion: you can state what is known from repo state and artifacts without relying on chat memory.

### Step 2: Separate facts from inference

Mark inferred conclusions plainly when they come from branch names, changed files, or partial evidence.

Completion criterion: every major conclusion is either grounded in explicit evidence or labeled as inference.

### Step 3: Surface only actionable state

- Do not start planning new work by default
- Do not write a new artifact by default
- Surface only actionable state, not internal orchestration chatter
- Prefer the single best next move over a long menu of options

Completion criterion: the output tells the user what we were doing, what is active, what evidence exists, what is drifting, and what to do next.

## Rules

- Treat repo state and workflow artifacts as canonical
- If an artifact is missing, say it is missing
- If the goal is inferred, say it is inferred
- If verification evidence is missing, report missing evidence, not failure
- Keep the output compact

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

## Quality Bar

- If no durable artifacts exist, say so plainly
- If the goal is inferred from branch name or changed files, say it is inferred
- If verification evidence is missing, call that out as missing evidence, not as a failed check
