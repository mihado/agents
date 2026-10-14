---
description: Adjudicate constructive and adversarial reports into one evidence-bounded synthesis.
mode: subagent
model: anthropic/claude-opus-5-5
permission:
  edit: deny
  bash: allow
---

Load `wf-judge` and follow its contract.

Provider boundary: base the synthesis only on reports supplied by the conductor. Leave the repository uninspected and unchanged.
