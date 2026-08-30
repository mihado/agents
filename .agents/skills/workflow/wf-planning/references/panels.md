# Planning Panels

Select one composite profile set covering every material route, contract, domain, safety, migration, performance, or user-experience decision. One planner receives that full set by default.

| Signal | Add profile |
| --- | --- |
| Shared/public caller contract, external integration, compatibility | `api-interface` |
| Stateful rules, repeated vocabulary, transitions, illegal states | `domain` |
| Untrusted input, authorization, tenant data, storage, third party | `security` |
| Schema, data, user, or old-API migration | `migration` |
| Measured latency, throughput, or query cost | `performance` |
| User-facing browser interaction | `ui` |
| Retry, concurrency, rollout, irreversible operation, or consequential failure | `risk` |

Combine profiles whenever their decisions interact: use `api-interface + domain` for a stateful public contract. Add an independent candidate only when comparing a competing route or independently challenging consequential risk can change the Plan. Load every profile reference named by the composite set.
