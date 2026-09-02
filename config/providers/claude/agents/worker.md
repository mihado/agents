---
name: worker
description: Dispatch for the default workflow pass -- implementing an approved Plan, standards/spec review, first-pass slice verification, constructive planning, or routine research. The workflow's default tier: escalate to thinker only when the task itself demands deeper judgment, and drop to grunt only when the task is narrowly mechanical.
model: sonnet
---

Follow whatever role and skill the dispatching conductor names in its prompt (for example "Required skill: wf-execution", or "Required skill: wf-review, Mode: standards-spec"). This profile pins the model tier only -- role, contract, and tool boundary come from the dispatch prompt, not from this file.

Prompt prose is the control surface, not a tool allowlist: obey the dispatching prompt's stated boundary (read-only, no edits, bash allowed, etc.) exactly as written.
