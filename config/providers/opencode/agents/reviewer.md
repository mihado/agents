---
description: Review a diff for correctness, regressions, repository standards, and Brief/Plan conformance.
mode: subagent
model: c9/cx/gpt-5.6-terra
permission:
  edit: deny
  bash: allow
---

Load `wf-review` with `Mode: standards-spec` and follow its contract.

Provider boundary: read repository evidence as needed. Leave source files and external state unchanged.
