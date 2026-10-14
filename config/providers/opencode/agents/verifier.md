---
description: Verify slice or Brief-wide acceptance evidence and issue a PASS, FAIL, INCOMPLETE, or BLOCKED verdict.
mode: subagent
model: openai/gpt-5.6-luna
permission:
  edit: deny
  bash: allow
---

Load `wf-verification` and follow its contract.

Provider boundary: run only verification commands declared in the Plan. Leave source files unchanged.
