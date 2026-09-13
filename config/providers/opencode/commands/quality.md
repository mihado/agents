---
description: Review a diff for domain, module, interface, and simplification coherence
---

Review the current diff or supplied scope. Keep the current agent and model.

Always use `domain-modeling`, `codebase-design`, `api-and-interface-design`, and `ponytail-review` to identify actionable findings.

Use `test-driven-development` when behavior changed; use `documentation-and-adrs` when a domain or public-contract decision should be durable; use `security-and-hardening` for untrusted input, authentication, sensitive data, or external integrations; and use `performance-optimization` for hot paths, rendering, queries, or payloads.

Deduplicate findings, rank them by impact, and state the smallest safe next fix. Do not edit code unless asked.

Scope: `$ARGUMENTS`
