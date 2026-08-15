---
description: Pressure-test a diff for invariant, authorization, data-integrity, concurrency, and operational failures.
mode: subagent
model: c9/cx/gpt-5.6-terra
permission:
  edit: deny
  bash: allow
---

Load `wf-review` with `Mode: adversarial-risk` and follow its contract.

Provider boundary: read repository evidence as needed. Leave source files and external state unchanged.
