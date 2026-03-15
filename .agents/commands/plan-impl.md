Use the eng-architect agent to produce a detailed implementation plan for: $ARGUMENTS

The plan is for the engineer, not stakeholders. Focus on:
- Exact files to create or modify
- Schema changes and migration strategy
- Unit boundaries and signatures before any code
- Transaction safety and edge cases
- Step sequence with dependencies called out
- What to defer and why

Save the plan as `docs/impl-<feature-slug>.md` in the current repo.

If no input given, ask: "What's the feature? Is there a PRD or context doc to read first?"
