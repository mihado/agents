---
description: Pressure-test a diff for invariant, authorization, data-integrity, concurrency, and operational failures.
mode: subagent
model: openai/gpt-6.1-sol
permission:
  edit: deny
  bash: allow
---

Load `wf-review` with `Mode: adversarial-risk` and follow its contract.

Provider boundary: read repository evidence as needed. Leave source files and external state unchanged.
