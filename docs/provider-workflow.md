# Provider Workflow

Date: 2026-07-07

This repository manages user-global agent tooling and workflow primitives that should be reproducible across machines and VMs.

OpenCode is the primary reference harness for this architecture. It exposes the control surfaces needed to define the workflow cleanly: agent roles, model pinning, command routing, permissions, and orchestration shape. Other providers such as Claude and Codex are secondary adapter targets. They may approximate the workflow with varying fidelity depending on their native constraints.

The canonical source of truth for provider configuration lives under `config/providers/`. Runtime files in `~/.claude/`, `~/.config/opencode/`, `~/.codex/`, and similar homes are installation targets, not source directories.

## Goal

Keep one repo as the canonical source for:

- shared workflow primitives
- shared skills
- provider-specific global configuration
- `apm install` / `apm check` logic that links or syncs provider state into the correct runtime location

This repository is not the place for project-specific agents.

The workflow is the product. Provider support is the adapter layer that installs or approximates that workflow in each harness.

## Core Rule

No project-scoped agent definitions belong in this repo.

If a provider needs custom agents, commands, or related workflow files, they should be committed under `config/providers/<provider>/...` and installed into that provider's user-global home by `apm`.

## Reference Harness

OpenCode is the canonical reference implementation for the workflow architecture in this repository.

That means:

- the shared workflow contract is defined first where it can be expressed most faithfully
- provider-specific constraints should not flatten the architecture prematurely
- Claude, Codex, and other harnesses are adapted from the OpenCode-defined contract rather than treated as equal inputs into the core abstraction

This is intentional. OpenCode currently offers the most direct path to explicit agent-role design with the least workaround burden. More opinionated harnesses may only support partial bindings. That is acceptable as long as the semantic contract remains clear.

## Provider Targets

| Provider | Canonical source in repo | Intended runtime destination | Role in architecture |
|---------|---------------------------|------------------------------|----------------------|
| OpenCode | `config/providers/opencode/` | `~/.config/opencode/` | primary reference implementation |
| Claude | `config/providers/claude/` | `~/.claude/` | secondary adapter target |
| Codex | `config/providers/codex/` | `~/.codex/` | secondary adapter target / stub acceptable |

The provider directories are unique. Shared skills remain shareable across tools, but provider runtime formats should not be conflated.

## Current Code Shape

The repo already has provider modules for:

| Module | Current responsibility |
|-------|-------------------------|
| `src/providers/claude.ts` | links `AGENTS.md`, `CLAUDE.md`, and skills into `~/.claude/`; manages Claude MCP |
| `src/providers/opencode/index.ts` | syncs provider manifest and MCP config into OpenCode config |
| `src/providers/codex.ts` | links `AGENTS.md` and skills into `~/.codex/`; manages Codex MCP |
| `src/providers/kiro.ts` | Kiro provider behavior |

What is missing is a first-class convention for provider-managed workflow artifacts such as global agents and related config that should be installed by `apm`.

The desired end state is not symmetric across providers. OpenCode should become the fullest expression of the workflow. Other providers should bind into the same semantics where possible, and degrade gracefully where not.

## Source vs Runtime Boundary

| Kind | Source of truth | Runtime target |
|-----|------------------|----------------|
| Shared instructions | repo root `AGENTS.md`, `CLAUDE.md` | linked into provider homes as needed |
| Shared skills | `.agents/skills/` | linked into provider homes as needed |
| Provider-specific agents | `config/providers/<provider>/agents/` | linked or synced into provider-specific global locations |
| Provider-specific config | `config/providers/<provider>/...` | synced into provider-specific runtime config |

This boundary matters because repo-local runtime-named directories like `.claude/` or `.opencode/` imply project scope. That conflicts with the repository's purpose when they are treated as committed source of truth.

## Workflow Layer vs Provider Layer

Keep these distinct.

| Layer | What belongs there |
|------|---------------------|
| Workflow layer | thinker, planner, writer, implementer, verifier, reviewer, judge roles; handoff contracts; escalation rules |
| Provider layer | Claude/OpenCode/Codex-specific file formats, install targets, permissions, model pinning, commands |
| Shared skill layer | reusable instructions or rubrics that multiple tools can load |

The workflow can be shared conceptually. The provider bindings should be separate implementations.

OpenCode is the place where that workflow is specified most fully. Other provider bindings should preserve the contract as far as their harness allows, rather than forcing the contract downward to the lowest common denominator.

## Shared Workflow Primitive

The current canonical workflow primitive is:

```text
think -> plan -> write -> act -> review
```

Think produces a Brief. Plan is adversarial iteration producing a Design doc. Write turns design into an Execution plan. Act is bounded implementation with verify loop. Review is independent critique.

This is the topological contract across providers, even if the concrete provider bindings differ.

### Stage Intent

| Stage | Purpose | Output |
|------|---------|--------|
| Think | refine the problem, surface blind spots, validate constraints | Brief: problem statement, constraints, explicit assumptions |
| Plan | adversarial iteration — business objectives, gotchas, pitfalls, risk map | Design doc: strategic decisions, tradeoffs, failure modes |
| Write | produce the ordered handoff artifact from settled design | Execution plan: ordered implementation units, dependencies, verification intent |
| Act | implement and verify in a loop until green | diff, verification evidence |
| Review | critique the change and its evidence | findings, residual risks, confidence |

### Planning and Review Discipline

The workflow should stay rigorous where leverage is highest:

- planning is iterative, concurrent, and role-split
- review is concurrent and role-split
- implementation consumes a bounded handoff contract
- verification is explicit in the design even if phased in operationally later
- the plan writer is structural, not analytical — it formats consensus, does not re-discover it

## Provider Binding Expectations

### Claude

Claude provider support should manage user-global Claude artifacts, not project-local ones.

Expected source shape:

```text
config/providers/claude/
  agents/
    reviewer.md
    ...
```

Expected runtime target:

```text
~/.claude/
  agents/
    reviewer.md
```

Claude-specific agent files should be installed and checked by the Claude provider module. They should not live at repo-root `.claude/` paths.

### OpenCode

OpenCode provider support should manage user-global OpenCode artifacts, not project-local `.opencode/` files in this repo.

This provider is the reference binding. The architecture described here is not incidental OpenCode customization; it is the primary expression of the workflow interface this repository is trying to define.

Expected source shape:

```text
config/providers/opencode/
  agents/
    planner.md
    reviewer.md
    judge.md
    ...
  commands/
    ...
  opencode.json
```

Expected runtime targets:

```text
~/.config/opencode/
  agents/
  commands/
  opencode.jsonc
```

The exact file mix can evolve, but the important rule is that the repo stores the source under `config/providers/opencode/` and `apm` installs it globally.

Other providers should be adapted from this workflow contract. They are not expected to have identical files or identical degrees of control.

#### Why OpenCode Needs Explicit Agent Pinning

OpenCode is the provider where workflow architecture and model routing are most tightly coupled.

The reason is structural:

- OpenCode lets each agent pin its own `model`
- subagents inherit the parent model unless they are explicitly pinned
- commands can select an `agent`
- commands can also override `model`, but that should be the exception rather than the default

That means the workflow is not fully specified unless the agent-role matrix is also specified.

#### OpenCode Pinning Rules

| Rule | Why |
|------|-----|
| Pin models on all meaningful workflow agents | otherwise subagents inherit the parent model and the architecture collapses into one model wearing different hats |
| Use commands to choose workflow lanes, not to do most model routing | keeps lane entrypoints simple and keeps the role architecture in the agent layer |
| Avoid `command.model` unless intentionally overriding a pinned agent | agent pinning should stay the canonical routing mechanism |
| Keep primaries minimal and put specialization in subagents | reduces UI clutter and keeps the orchestration graph explicit |
| Put permissions on the agent, not only in the prompt | makes the role contract enforceable |

Model selections are part of the reference implementation and the current preferred routing. They were chosen deliberately for the present balance of quality, cost, and workflow fit. They may evolve later as model economics and capability profiles change, but they are not placeholders.

#### OpenCode Workflow Roles

The workflow roles below are the current architecture targets for OpenCode.

| Role | Suggested agent name | Mode | Pinned model | Permission shape | Phase | Purpose |
|------|----------------------|------|--------------|------------------|-------|---------|
| Conductor | `conductor` | primary | `cx/gpt-5.4` | edit + bash + task | POC | owns all workflow orchestration: fan-out, judge handoff, artifact writes, act retry loop |
| Safe analysis surface | `plan` | primary | inherited or `cx/gpt-5.4` | edit denied, bash restricted | built-in | optional human-facing analysis surface (OpenCode built-in) |
| Thinker | `thinker` | subagent | `deepseek-v4-pro-fusion` | read-only; question allowed | post-POC | ideation: interview-me skill, produce Brief |
| Thinker high | `thinker-high` | subagent | `kiro-claude-sonnet` | read-only; question allowed | post-POC | deeper probing |
| Planner | `planner` | subagent | `deepseek-v4-pro-fusion` | read-only | POC | constructive: architecture mapping, touchpoints, execution order |
| Planner adversarial | `planner-adversarial` | subagent | `kiro-claude-sonnet` | read-only | POC | adversarial: find what breaks, what's missed, where it fails |
| Planner high | `planner-high` | subagent | `kiro-claude-opus` | read-only | post-POC | adversarial at higher capability (`/planx` lane) |
| Plan writer | `plan-writer` | subagent | `deepseek-v4-pro-fusion` | read-only | POC | structural: format settled design into ordered execution plan |
| Implementer | `typist` | subagent | `minimax-m3` (consider `kiro-claude-sonnet`) | edit allowed | POC | routine code production against execution plan; low-risk decisions only |
| Verifier | `verifier` | subagent | `deepseek-v4-flash-fusion` | read-only; bash allowed | POC | run typecheck, lint, tests; report pass/fail |
| Reviewer | `reviewer` | subagent | `deepseek-v4-pro-fusion` | read-only | POC | constructive: correctness, regressions, test sufficiency |
| Reviewer adversarial | `reviewer-adversarial` | subagent | `kiro-claude-sonnet` | read-only | POC | adversarial: invariants, auth, data, concurrency — find what breaks |
| Reviewer high | `reviewer-high` | subagent | `kiro-claude-opus` | read-only | post-POC | adversarial at higher capability (`/reviewx` lane) |
| Judge | `judge` | subagent | `cx/gpt-5.5` | read-only | POC | final synthesis, disagreement resolution, confidence verdict |

Notes:

- POC scope: 9 agent files (conductor + 8 subagents), 5 command files. Think lane, high lanes (`/planx`, `/reviewx`), durability/recovery, and checkpoint machinery are post-POC.
- The judge is the same agent and prompt across both POC lanes (planning and review). Its job is synthesis and conflict resolution between two worker outputs — the domain (plan vs review) is context, not a prompt fork.
- The implementer lane is intentionally cheaper than planning and review — its job is bounded execution against a settled plan, not discovery.
- Verification is deliberately cheap (`deepseek-v4-flash-fusion`) — typecheck, lint, and test run are mechanical pass/fail signals, not analytical work.
- Worker A is always constructive (make it work). Worker B is always adversarial (make it fail). The judge surfaces the core tension between them rather than forcing a false consensus.
- The plan writer is structural, not analytical — it takes consensus output from the planner/judge loop and formats it into a handoff artifact. Should not re-discover or re-adjudicate decisions.

#### OpenCode Think Matrix

> Post-POC. Not in the initial build.

Ideation is upstream of planning. The thinker runs the `interview-me` skill to pressure-test assumptions, then produces a refined problem statement and constraint set. Output is a Brief — not a plan.

#### OpenCode Planning Matrix

Planning is concurrent and role-split, mirroring the review architecture. The planner loop iterates (constructive vs adversarial → judge) until the user is satisfied, then the plan writer produces the handoff artifact.

**POC lanes:**

| Lane | Entry command | Conductor | Worker A | Worker B | Judge | Output |
|------|---------------|-----------|----------|----------|-------|--------|
| Planning | `/plan` | `cx/gpt-5.4` | `planner` (DS V4 Pro) | `planner-adversarial` (Kiro Sonnet) | `judge` (GPT-5.5) | `.agent-contexts/design.md` |
| Write | `/plan-write` | `cx/gpt-5.4` | `plan-writer` (DS V4 Pro) | — | — | `.agent-contexts/plan.md` |

**Post-POC:** `/planx` with `planner-high` (Kiro Opus) as adversarial worker.

Worker mandate split:

| Worker | Default mandate |
|--------|-----------------|
| `planner` | constructive: architecture, codebase touchpoints, execution order |
| `planner-adversarial` | adversarial: failure modes, tradeoffs, hidden risk — what breaks, what's missed |
| `plan-writer` | structural: take settled design/consensus, produce ordered execution plan |
| `judge` | receive two worker outputs, adjudicate conflicts, surface core tensions |

#### OpenCode Review Matrix

Review is concurrent and role-split. Both lanes converge through the same judge for final synthesis — the judge prompt and contract are identical; only the worker cadence changes.

**POC lanes:**

| Lane | Entry command | Conductor | Worker A | Worker B | Judge | Output |
|------|---------------|-----------|----------|----------|-------|--------|
| Review | `/review` | `cx/gpt-5.4` | `reviewer` (DS V4 Pro) | `reviewer-adversarial` (Kiro Sonnet) | `judge` (GPT-5.5) | `.agent-contexts/review.md` |

**Post-POC:** `/reviewx` with `reviewer-high` (Kiro Opus) as adversarial worker.

Worker mandate split:

| Worker | Default mandate |
|--------|-----------------|
| `reviewer` | constructive: correctness, regressions, test sufficiency |
| `reviewer-adversarial` | adversarial: invariants, auth, data, concurrency — find what breaks |
| `judge` | receive two worker reports, adjudicate disagreements, return final synthesis with confidence |

The judge receives only the two worker reports, not raw code. Its job is synthesis and disagreement resolution, not independent discovery. Review findings must cite `file:line` and use P0-P3 severity.

#### OpenCode Command Architecture

Commands expose workflow lanes, not model choices. All commands target `agent: conductor`. The conductor prompt owns orchestration logic; command templates declare the lane and artifact.

**POC commands:**

| Command | Agent | Expected behavior |
|---------|-------|-------------------|
| `/plan` | `conductor` | dispatch planner + planner-adversarial in parallel → judge; return synthesis, ask to iterate or write |
| `/plan-write` | `conductor` | dispatch plan-writer to format design into execution plan → `.agent-contexts/plan.md` |
| `/act` | `conductor` | dispatch typist → dispatch verifier → if fail, typist fixes → repeat. Stop after 3 consecutive verify failures and surface blocker |
| `/verify` | `conductor` | dispatch verifier: typecheck, lint, tests → `.agent-contexts/verify.md` |
| `/review` | `conductor` | if no args: `git diff HEAD`. If args: conductor interprets as diff scope. Dispatch reviewer + reviewer-adversarial in parallel → judge → `.agent-contexts/review.md` |

**Post-POC:** `/think`, `/thinkx`, `/planx`, `/planx-write`, `/reviewx`.

#### OpenCode Permission Architecture

The role matrix should be enforced through permissions, not only prompts.

| Agent type | Minimum permission stance | Phase |
|-----------|---------------------------|-------|
| Conductor | edit + bash + task | POC |
| Planning agents | read-only | POC |
| Review agents | read-only | POC |
| Judge | read-only | POC |
| Implementer | edit allowed; bash allowed | POC |
| Verifier | read-only code; bash allowed | POC |

Permissions are lax for POC — the role intent is preserved in prompts (planners/reviewers must not edit). Tighten after the loop works end-to-end.

#### OpenCode Architectural Question To Keep Visible

The OpenCode architecture is not only "which models do we like?" It is also:

- which roles are primaries vs subagents
- which roles are always pinned
- which lanes are exposed as commands
- which stages are concurrent versus sequential
- where final synthesis lives

The matrices above are the current reasoning surface for that architecture.

#### OpenCode Durability & Recovery

> Post-POC. Not in the initial build.

Every stage writes durable checkpoints to `.agent-contexts/sessions/`. No subagent-to-subagent communication — the conductor is always the bridge, and all intermediate outputs persist to disk.

The durable-session contract is architectural. The exact file layout, checkpoint marker, and resume mechanics are implementation choices that can evolve as long as the same guarantees hold: recoverability, inspectability, and orchestrator-mediated handoff.

##### Dual Read Protocol

Subagents write their own checkpoint to a known path. The orchestrator reads from two sources in parallel:

**Fast path (default):** orchestrator reads the subagent's in-memory text response. This is what the subagent returns on completion. No disk I/O, lowest latency.

**Recovery path:** orchestrator polls the checkpoint file when:
- The orchestrator session crashed and is resuming
- The subagent has been running longer than a timeout threshold without returning

When reading from disk, the orchestrator must validate that a checkpoint is complete before consuming it. The completion marker and exact corruption-handling mechanism are implementation details; the important rule is that partial outputs are never mistaken for committed outputs.

##### Directory Structure

```text
.agent-contexts/sessions/<project>-<date>-<topic>/
  session.md              # frontmatter: stage, state, timestamps; body: human-readable summary
  brief.md                # /think output
  design.md               # /plan output (Design doc)
  plan.md                 # /plan write output (Execution plan)
  review.md               # /review output
  runs/
    <run-id>/
      planner.md
      planner-adversarial.md
      judge-synthesis.md
```

`session.md` uses markdown with YAML frontmatter so it is both machine-parseable and human-readable:

```yaml
---
stage: plan
state: judging
project: agents
topic: refactor-auth
created: 2026-07-07T14:30:00Z
updated: 2026-07-07T14:32:15Z
command: /plan write
---

## Plan: Refactor auth module
Design doc written, workers dispatched, waiting on judge synthesis.
```

States: `thinking | planning | writing-design | writing-plan | acting | reviewing | complete | abandoned`.

Project is resolved from `git remote get-url origin`, slugified. Overridable via `APM_CONTEXT_DIR` env — point to a shared folder for cross-repo orchestration. The project prefix keeps sessions isolated when multiple repos share a context directory.

##### Checkpoint Contract

| Stage | Artifacts on disk | What survives |
|-------|-------------------|---------------|
| Think | `brief.md` | complete output |
| Plan | `runs/<run-id>/` — planner.md, planner-adversarial.md, judge-synthesis.md | worker outputs + judge synthesis per iteration |
| Write | `design.md`, `plan.md` | Design doc + Execution plan |
| Act | `runs/<run-id>/` — typist diff, verifier output | each attempt's diff and pass/fail |
| Review | `review.md`, `runs/<run-id>/` — reviewer.md, reviewer-adversarial.md, judge-synthesis.md | all worker outputs + final findings |

##### Recovery Protocol

On any command invocation, the orchestrator checks for an existing `session.md` with matching project/topic and state != `complete` or `abandoned`. If found:

1. Read `session.md` frontmatter to determine current stage and state
2. Read the latest run artifacts to understand exactly where the pipeline stopped
3. Surface a summary to the user: what was in progress, what completed, what's pending
4. Wait for user choice: resume, restart from current stage, or abandon

The user can always ask "where are we" and the orchestrator reads `session.md` to self-calibrate.

### Codex

Codex can start as a stub.

Expected source shape:

```text
config/providers/codex/
```

Even if it remains mostly empty at first, the directory establishes the same contract: provider-owned global config belongs under `config/providers/codex/`, not in project-scoped runtime-named directories. Codex is a downstream adapter target, not the source of the workflow abstraction.

## OpenCode and Other Providers Should Not Be Conflated

Even when workflow roles share names, provider files remain distinct.

The workflow contract (roles, mandates, lane routing) is shared. The provider bindings (agent file format, model pinning, permissions, command structure) are separate implementations.

OpenCode defines the richest binding. Other providers should preserve the semantics where possible, but they are allowed to be lossy adapters.

## `apm` Responsibilities

`apm providers install` and `apm providers check` should become the single managed path for provider-global workflow files.

`apm` is not only a file sync tool. It is the binding layer that installs the shared workflow contract into each provider's runtime shape.

### Install

| Action | Meaning |
|-------|---------|
| Link shared instructions | link root instruction files into provider homes where appropriate |
| Link shared skills | link skills into provider homes where appropriate |
| Link provider agents | link or sync `config/providers/<provider>/agents/` into provider runtime homes |
| Sync provider config | write provider manifests/config files into provider runtime config locations |
| Install MCP entries | manage provider MCP configuration |

### Check

| Action | Meaning |
|-------|---------|
| Verify shared instruction links | runtime points back to repo source |
| Verify shared skill links | runtime points back to repo source |
| Verify provider agent links | installed global agent files match repo source |
| Verify provider config | runtime config matches manifest source |
| Verify MCP configuration | runtime MCP state matches manifest source |

## What To Avoid

| Avoid | Why |
|------|-----|
| Repo-root `.claude/agents/` or `.opencode/agents/` as committed source | implies project scope; conflicts with the repo's global purpose |
| Reusing one provider's runtime file as another's source artifact | couples incompatible formats and discovery models |
| Making this repo host project-specific overrides | breaks the global managed-config boundary |

## Documentation Structure

This document is the canonical description of provider-global workflow and configuration boundaries.

Supporting docs should do narrower jobs:

| Doc | Purpose |
|----|---------|
| `docs/skill-lifecycle.md` | canonical skill supply chain |
| `docs/provider-workflow.md` | canonical provider-global workflow/config boundary |
| `docs/assessments/...` | evaluations and external references |
| `docs/plans/...` | temporary implementation notes, not canonical long-term truth |

## POC Implementation Plan

### Scope

OpenCode only. POC proves the adversarial loop works end-to-end for planning and review.

### Files to create (14)

**Agents** (`config/providers/opencode/agents/`):

| File | Mode | Model | Permission | Purpose |
|------|------|-------|------------|---------|
| `conductor.md` | primary | `cx/gpt-5.4` | edit + bash + task | owns fan-out, judge handoff, artifact writes, act retry loop |
| `planner.md` | subagent | `deepseek-v4-pro-fusion` | read-only | constructive: architecture, touchpoints, order |
| `planner-adversarial.md` | subagent | `kiro-claude-sonnet` | read-only | adversarial: what breaks, what's missed |
| `plan-writer.md` | subagent | `deepseek-v4-pro-fusion` | read-only | structural: format design → execution plan |
| `typist.md` | subagent | `minimax-m3` | edit + bash | implement execution plan |
| `verifier.md` | subagent | `deepseek-v4-flash-fusion` | read + bash | typecheck, lint, tests |
| `reviewer.md` | subagent | `deepseek-v4-pro-fusion` | read-only | constructive: correctness, regressions |
| `reviewer-adversarial.md` | subagent | `kiro-claude-sonnet` | read-only | adversarial: invariants, auth, concurrency |
| `judge.md` | subagent | `cx/gpt-5.5` | read-only | synthesis, disagreement resolution, confidence |

**Commands** (`config/providers/opencode/commands/`):

| File | Agent | Behavior |
|------|-------|----------|
| `plan.md` | conductor | no args → ask. Args → dispatch planner + adversarial → judge → `.agent-contexts/design.md` |
| `plan-write.md` | conductor | dispatch plan-writer → `.agent-contexts/plan.md` |
| `act.md` | conductor | dispatch typist → verifier → if fail (max 3), stop and surface |
| `verify.md` | conductor | dispatch verifier → `.agent-contexts/verify.md` |
| `review.md` | conductor | no args → `git diff HEAD`. Args → conductor interprets scope. Dispatch reviewer + adversarial → judge → `.agent-contexts/review.md` |

### Install scope

Extend `src/providers/opencode/index.ts` to symlink `config/providers/opencode/agents/*.md` → `~/.config/opencode/agents/` and `config/providers/opencode/commands/*.md` → `~/.config/opencode/commands/`. Provider config and MCP merge stay as-is.

### Test order

1. `/review` against a real diff — simplest validation, one shot
2. `/plan` against a real problem — iterative until satisfied
3. `/plan-write` — format output
4. `/verify` — standalone verifier
5. `/act` — implement + verify loop

### What stays for MVP

After POC validates the loop:

| Deliverable | Phase |
|------------|-------|
| `/think` + `thinker` agents | MVP |
| `/reviewx`, `/planx` high-lanes | MVP |
| Durability & recovery (sessions, checkpoints, QED) | MVP |
| Permission hardening | MVP |
| Claude adapter (reviewer agent) | MVP |
| Codex stub directory | MVP |
| `apm check` for agents and commands | MVP |

### What stays for later

- Multi-repo orchestration
- Cross-provider handoff contracts
- Think pipeline mode (`ce-brainstorm` → `/think` auto-chaining)

## Revision Notes

- 2026-07-08: Added POC implementation plan. Renamed orchestrator to conductor. Marked think, high-lanes, and durability as post-POC. Collapsed review/plan matrices to POC-only lanes. Simplified permission table for POC lax mode.

## References

- [OpenCode Agents](https://opencode.ai/docs/agents/)
- [OpenCode Commands](https://opencode.ai/docs/commands/)
- [OpenCode Formatters](https://opencode.ai/docs/formatters/)
- [OpenCode Permissions](https://opencode.ai/docs/permissions/)
- [Compound Engineering Plugin](https://github.com/EveryInc/compound-engineering-plugin) — borrowed the multi-persona adversarial review pattern, scaled from 13 reviewers to 2
