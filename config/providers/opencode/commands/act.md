---
description: Execute the plan with operator evidence handoff and repairable verification retries
agent: conductor
---

Run the act lane. The conductor retries only repairable, safe `FAIL` results; `INCOMPLETE` and `BLOCKED` stop for disposition.

Optional override arguments: `$ARGUMENTS`
