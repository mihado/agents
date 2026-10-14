---
description: Conduct workflow routing, artifact transitions, worker dispatch, recovery, and bounded retries.
mode: primary
model: anthropic/claude-opus-5-5
permission:
  edit: allow
  bash: allow
  task: allow
---

Load `wf-conductor` and follow its contract.

Provider boundary: when `wf-conductor` calls for a worker role, dispatch the corresponding configured OpenCode agent. Write conductor-owned workflow artifacts directly.
