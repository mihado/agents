# Compound Engineering Plugin Assessment

Date: 2026-06-07

Upstream: [EveryInc/compound-engineering-plugin](https://github.com/EveryInc/compound-engineering-plugin)

Evaluated commit: [`966e32f5b5efec4830b347fff420482e05c90d4e`](https://github.com/EveryInc/compound-engineering-plugin/tree/966e32f5b5efec4830b347fff420482e05c90d4e)

## Context

The objective is to make low-level engineering tasks and side-project execution increasingly hands-off while keeping human attention on product design, data models, workflow design, business invariants, and other high-value decisions. The shared engineering repository should support Claude Code and Codex without becoming a large collection of competing personas and overlapping workflows.

The Compound Engineering plugin is an opinionated engineering operating system with more than 50 specialized agents and a broad set of skills covering planning, implementation, review, debugging, documentation, product feedback, and autonomous delivery. Its strongest contribution is the structure of its execution loops rather than the number of agents it provides.

## Recommendation

Do not vendor or install the complete plugin into the shared engineering layer. It overlaps substantially with the current skills, introduces Claude-oriented orchestration assumptions, increases context and token usage, and would create competing default workflows.

Borrow selected architecture and control-loop patterns. Trial the complete plugin separately on an ephemeral VM or low-risk side project before promoting anything beyond the initial architecture material.

## Borrow Now

### Agent-Native Architecture

The [`ce-agent-native-architecture`](https://github.com/EveryInc/compound-engineering-plugin/tree/966e32f5b5efec4830b347fff420482e05c90d4e/plugins/compound-engineering/skills/ce-agent-native-architecture) skill is directly relevant to building SaaS products with agentic workflows and learning to build a personal-agent harness. Its references cover action parity, context injection, shared workspaces, execution patterns, capability discovery, MCP tool design, and agent-native testing.

This is the best initial candidate to vendor unchanged under `.agents/skills/agentic/` for evaluation.

Its principle that tools should be primitives needs qualification. Agents can choose and compose workflows, but deterministic domain code must continue to enforce authorization, tenant isolation, validation, idempotency, transaction boundaries, and other business invariants. Prompts should not be the sole location of critical business logic.

### Debugging Discipline

The [`ce-debug`](https://github.com/EveryInc/compound-engineering-plugin/tree/966e32f5b5efec4830b347fff420482e05c90d4e/plugins/compound-engineering/skills/ce-debug) workflow contains useful improvements over the current debugging skill:

- Explain the complete causal chain before applying a fix.
- Make testable predictions for uncertain links in that chain.
- Explicitly invalidate a failed hypothesis before trying another.
- Escalate after a bounded number of failed hypotheses or fixes.

Do not vendor a second overlapping debugging skill. These concepts should eventually be incorporated into a first-party autonomous execution workflow or a future revision of the existing debugging guidance.

### Risk-Routed Review

The [`ce-code-review`](https://github.com/EveryInc/compound-engineering-plugin/tree/966e32f5b5efec4830b347fff420482e05c90d4e/plugins/compound-engineering/skills/ce-code-review) workflow selects reviewers based on the changed surface, requires evidence for findings, assigns confidence, deduplicates findings, and distinguishes automated fixes from decisions requiring judgment.

The most useful review dimensions for SaaS work are correctness, testing, data integrity and migrations, security, API contracts, and reliability. These should become risk-based review passes rather than permanent persona agents. Data-model and migration findings should normally remain human-reviewed because they can encode product semantics and irreversible operational decisions.

### Selective Compounding

The [`ce-compound`](https://github.com/EveryInc/compound-engineering-plugin/tree/966e32f5b5efec4830b347fff420482e05c90d4e/plugins/compound-engineering/skills/ce-compound) workflow captures solved problems as durable project knowledge and includes a refresh lifecycle for stale or overlapping documentation.

The concept is useful, but automatic documentation after every task would produce low-value material. Capture a learning only when it is non-obvious, expensive to rediscover, likely to recur, and supported by verified evidence. Product-specific learnings should remain in the product repository. Promote a pattern into this shared repository only after it recurs across projects.

## Future Harness Pattern

The long-term harness should implement a smaller and safer version of the plugin's autonomous execution loop:

```text
human intent and constraints
-> scoped implementation units
-> isolated workers
-> tests and runtime verification
-> risk-based review
-> bounded repair loop
-> PR with evidence and residual risks
```

Each handoff should define the goal, acceptance criteria, scope boundaries, business invariants, permitted external actions, maximum retries, escalation conditions, and required verification evidence.

The harness should stop and return control when it encounters ambiguous product semantics, data-model changes, destructive migrations, authorization decisions, irreversible external actions, or requirements that conflict with established invariants. These are high-value decisions rather than low-level execution details.

Useful patterns from the plugin's [`lfg`](https://github.com/EveryInc/compound-engineering-plugin/tree/966e32f5b5efec4830b347fff420482e05c90d4e/plugins/compound-engineering/skills/lfg) workflow include explicit stages, bounded CI repair attempts, durable residual findings, and a clear terminal completion contract. The complete workflow should not be adopted yet because it combines planning, editing, commits, pushes, pull requests, browser testing, and CI repair into a large autonomous blast radius.

## Avoid For Now

- Vendoring the entire plugin or its full persona collection.
- Mandatory planning for every task.
- Multiple overlapping implementations of planning, debugging, review, and testing.
- Numeric architecture scores that imply more precision than the evidence supports.
- Automatically documenting every completed task.
- Allowing prompts to replace deterministic domain logic.
- Automatically committing, pushing, opening pull requests, or filing tracker items without an explicit authority boundary.
- Automating product strategy, product semantics, data-model ownership, or workflow design by default.

## Evaluation Plan

Trial the complete plugin outside the shared layer on several low-risk side-project tasks. Include a few small implementation tasks, one substantial debugging task, one review, and one selectively captured learning.

Measure:

- Number and type of human interventions.
- Time from task handoff to verified completion.
- Unnecessary files or abstractions introduced.
- Review false positives and duplicated findings.
- Failed or repeated repair attempts.
- Token and tool-call cost.
- Residual defects found after completion.
- Decisions escalated to the human, including whether escalation happened at the right boundary.

Promote only the workflows or concepts that consistently reduce supervision without weakening correctness or taking over product and domain decisions.

## Revisit Triggers

Revisit this assessment after the agent-native architecture skill has been used on a real harness design, after three or more autonomous side-project tasks have been observed, or when repeated gaps appear in the current implementation and review workflows.
