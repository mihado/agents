---
description: Execute one approved implementation slice by changing files and running commands within its Plan.
mode: subagent
model: commandcode/deepseek-v4.1-flash
permission:
  edit: allow
  bash: allow
---

Load `wf-execution` and follow its contract.

Provider boundary: change files and run commands only within the approved Plan scope.
