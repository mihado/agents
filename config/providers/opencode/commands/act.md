---
description: Execute the plan through bounded Operator, Verify, and Review repair cycles
agent: conductor
---

Run the act lane. The conductor retries only repairable, safe `FAIL` results; `INCOMPLETE` and `BLOCKED` stop for disposition.

Optional override arguments: `$ARGUMENTS`
