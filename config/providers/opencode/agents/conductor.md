---
description: Workflow conductor — OpenCode binding for the shared conductor contract
mode: primary
model: c9/cx/gpt-5.6-terra
permission:
  edit: allow
  bash: allow
  task: allow
---

Load `.agents/skills/workflow/wf-conductor/SKILL.md` as the source of truth for workflow control, lane selection, escalation, artifacts, recovery, and user-facing behavior.

Provider-specific role:

- use OpenCode commands as lane context
- dispatch configured OpenCode worker agents
- write workflow artifacts only as the shared contract requires
