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
| Kiro | `config/providers/kiro/` | `~/.kiro/` | secondary adapter target with custom-agent binding |

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
| Workflow layer | conductor (idea + think modes), planner, implementer, verifier, reviewer, judge roles; handoff contracts; escalation rules |
| Provider layer | Claude/OpenCode/Codex-specific file formats, install targets, permissions, model pinning, commands |
| Shared skill layer | reusable instructions or rubrics that multiple tools can load |

The workflow can be shared conceptually. The provider bindings should be separate implementations.

Longer term, keep provider agents thin. The agent should primarily carry model pinning, permission posture, and lane-routing instructions, then dispatch into shared skills for reusable behavior. Do not collapse agents away while model routing and permission boundaries still live in the provider layer.

Shared skill source of truth lives under `.agents/skills/`. Provider runtime skill directories such as `.kiro/skills/` are adapter targets, not source directories.

The first shared extraction targets are (these are the behavior "chapters"; this doc is the map):

- [`.agents/skills/engineering/recovery-orientation/SKILL.md`](.agents/skills/engineering/recovery-orientation/SKILL.md) — re-orientation after context decay
- [`.agents/skills/engineering/review-standards-spec/SKILL.md`](.agents/skills/engineering/review-standards-spec/SKILL.md) — default review pass (Standards + Spec)
- [`.agents/skills/engineering/review-adversarial-risk/SKILL.md`](.agents/skills/engineering/review-adversarial-risk/SKILL.md) — adversarial review pass (invariants, auth, data, concurrency)

OpenCode is the place where that workflow is specified most fully. Other provider bindings should preserve the contract as far as their harness allows, rather than forcing the contract downward to the lowest common denominator.

## Shared Workflow Primitive

The current canonical workflow primitive is:

```text
idea -> think -> plan -> act -> verify -> review
```

Every task should still pass through the same mental topology even when the rigor is light: resolve ambiguity if needed, think through the task until it is briefable, write a Brief, turn that Brief into an Execution plan, implement, verify, then review. The conductor decides how rigorous each stage must be for the current task.

In day-to-day use, the conductor should also work as an everyday direct profile: handle small, clear requests directly, use [`recovery-orientation`](.agents/skills/engineering/recovery-orientation/SKILL.md) behavior for re-orientation requests, and dispatch specialized workers only when the task benefits from the extra rigor.

This is the topological contract across providers, even if the concrete provider bindings differ.

### Stage Intent

| Stage | Purpose | Output |
|------|---------|--------|
| Idea | optional upstream ambiguity-resolution stage when the task is still too foggy to safely brief | enough clarity to enter Think; no fixed POC artifact yet |
| Think | refine the problem, surface blind spots, validate constraints, and produce the Brief | `brief.md`: problem statement, constraints, assumptions, acceptance criteria, risks |
| Plan | turn the Brief into an ordered execution handoff | Execution plan: ordered implementation units, dependencies, verification intent |
| Act | implement and verify in a loop until green | diff, verification evidence |
| Verify | run explicit checks on the current working tree or runtime path | verification report |
| Review | critique the change and its evidence | findings, residual risks, confidence |

### Planning and Review Discipline

The workflow should stay rigorous where leverage is highest, but the rigor should be chosen dynamically rather than hard-coded into every lane:

- every task still produces a Brief and an Execution plan artifact, even when they are lightweight
- `idea` is optional; do not force a Brief when the task is still too ambiguous to think through safely
- think and review may be lightweight or escalated depending on task risk and ambiguity
- planning and review escalation are selected by the conductor based on risk, ambiguity, and changed surface
- concurrency and adversarial passes are tools to apply when needed, not mandatory shape for every task
- implementation consumes a bounded handoff contract
- verification is explicit in the plan even if phased in operationally later

### Escalation & Judge

Rigor is chosen by the conductor per task from risk, ambiguity, and changed surface — not by separate high-lane commands. Default to a single cheap worker (planner, reviewer); add the adversarial worker and judge only when the task warrants it. The shared skills (`review-standards-spec`, `review-adversarial-risk`) carry the escalation rubric.

Judge rule: one substantive worker → conductor finalizes the artifact directly; two or more workers → judge synthesizes the final artifact.

## Provider Binding Expectations

### Claude

Claude provider support should manage user-global Claude artifacts, not project-local ones.

Expected source shape:

```text
config/providers/claude/
  agents/
    reviewer.json
    ...
```

Expected runtime target:

```text
~/.claude/
  agents/
    reviewer.json
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
| Avoid `command.model` unless intentionally overriding a pinned agent | agent pinning should stay the canonical routing mechanism |
| Keep primaries minimal and put specialization in subagents | reduces UI clutter and keeps the orchestration graph explicit |
| Put permissions on the agent, not only in the prompt | makes the role contract enforceable |

Model selections are part of the reference implementation and the current preferred routing. They were chosen deliberately for two purposes, not one:

- **Efficiency** — route each role to the cheapest model adequate for the job (cheap typist, mid-tier planner/reviewer, stronger adversarial/judge), keeping the solo-dev token budget sane.
- **Heterogeneity (diversity)** — deliberately spread roles across different model families so that no single model's blind spots propagate end-to-end. The implementer (`minimax-m3`) differs from the reviewer (`DeepSeek V4 Pro`) and the adversarial workers (`GPT-5.4`); the judge (`c9/cx/gpt-5.6-sol`) is yet another. This independence is what lets the adversarial planning, review, and (where used) test-authoring surfaces catch gaps the implementer would otherwise miss — it is a designed property of the routing, not a side effect of cost.

They may evolve later as model economics and capability profiles change, but they are not placeholders.

Model IDs in agent frontmatter are provider-qualified as `<provider>/<model>` (for example `c9/cx/gpt-5.4`). OpenCode is multi-provider, so the qualifier is required — without it the role matrix collapses into the parent model (see Why OpenCode Needs Explicit Agent Pinning). `c9` is the custom OpenCode provider defined in `config/providers/opencode.json` (`baseURL: https://c9.rter.cc/v1`); swap the provider prefix if your gateway differs.

Other harnesses may not need the qualifier: when a harness talks to an OpenAI-compatible endpoint directly (base URL + key, single provider context), the model string is often just the bare name. Only OpenCode's multi-provider routing requires the `<provider>/` prefix. Keep the agent files provider-qualified for OpenCode; adapter targets handle their own model format.

#### OpenCode Workflow Roles

The workflow roles below are the current architecture targets for OpenCode.

| Role | Suggested agent name | Mode | Pinned model | Permission shape | Phase | Purpose |
|------|----------------------|------|--------------|------------------|-------|---------|
| Conductor | `conductor` | primary | `c9/cx/gpt-5.6-terra` | edit + bash + task | POC | owns workflow orchestration: stage selection, escalation, artifact writes, act retry loop. Idea and think are modes of the conductor, not separate workers. |
| Safe analysis surface | `plan` | primary | inherited or `c9/cx/gpt-5.4` | edit denied, bash restricted | built-in | optional human-facing analysis surface (OpenCode built-in) |
| Planner | `planner` | subagent | `c9/deepseek-v4-pro-fusion` | edit denied; bash allowed | POC | constructive design pass: architecture mapping, touchpoints, execution order |
| Planner adversarial | `planner-adversarial` | subagent | `c9/cx/gpt-5.4` | edit denied; bash allowed | POC | elevated design pass: find what breaks, what's missed, where it fails |
| Implementer | `typist` | subagent | `c9/minimax-m3` | edit allowed | POC | routine code production against execution plan; low-risk decisions only |
| Verifier | `verifier` | subagent | `c9/mino-v2.5` | edit denied; bash allowed | POC | run typecheck, lint, tests, and runtime/browser checks when needed; report pass/fail |
| Reviewer | `reviewer` | subagent | `c9/deepseek-v4-pro-fusion` | edit denied; bash allowed | POC | default review pass: correctness, regressions, test sufficiency |
| Reviewer adversarial | `reviewer-adversarial` | subagent | `c9/cx/gpt-5.4` | edit denied; bash allowed | POC | elevated review pass: invariants, auth, data, concurrency — find what breaks |
| Judge | `judge` | subagent | `c9/cx/gpt-5.6-sol` | edit denied; bash allowed | POC | final synthesis, disagreement resolution, confidence verdict |

Notes:

- POC scope: conductor plus the minimal worker set needed to drive think, plan, act, verify, and review. Durability/recovery and checkpoint machinery are post-POC.
- The judge is the same agent and prompt across think, plan, and review. Its job is synthesis and conflict resolution between multiple worker outputs — the domain is context, not a prompt fork.
- The implementer lane is intentionally cheaper than planning and review — its job is bounded execution against a settled plan, not discovery.
- Verification defaults to `c9/mino-v2.5` for now to keep one evidence surface across code and browser/runtime checks. Revisit only after usage evidence justifies splitting the verifier path.
- The architecture borrows CE's control-loop pattern but starts lighter: fewer always-on workers, conductor-owned escalation, and cost-aware elevation suitable for a solo developer budget.

#### OpenCode Idea Stage

`idea` is a conductor mode, not a separate worker or command (see Command Architecture).

Use it when the task is too ambiguous to safely write a Brief. The likely future adoption path is tracked investigation tickets, but full tracker-backed idea-stage workflow is post-POC.

POC rule:

- if the task is clear enough, skip idea and go straight to `/think` (or handle directly)
- if the task is foggy, resolve it inline using `interview-me` discipline (one question at a time, hypothesis first, explicit restate and confirmation) until intent is clear
- if resolving the idea needs codebase discovery or research, dispatch `wayfinder` or a background research job rather than blocking inline — the conductor stays in the loop and reports findings back
- stop and surface unresolved ambiguity rather than force a bad Brief

#### OpenCode Think Stage

Think is a mode of the conductor, not a separate `thinker` worker. There is no `thinker` agent.

The workflow always starts with thinking, but the amount of rigor is dynamic. For simple tasks the conductor may produce a lightweight Brief directly from the user's request. For ambiguous or high-risk tasks the conductor applies `interview-me` discipline harder and resolves intent inline before writing the Brief.

When the user returns after context decay, the conductor should first infer whether the real intent is re-orientation rather than fresh thinking. Prompts like "what did we do", "where are we", "catch me up", or similar should trigger a [`recovery-orientation`](.agents/skills/engineering/recovery-orientation/SKILL.md) pass over repo state and existing workflow artifacts before the conductor decides whether a new Brief or Plan is needed.

The Brief is the design-thinking artifact. There is no separate `design.md` in the current model.

Escalation signals for think/brief include ambiguous requirements, broad scope, product-semantics decisions, auth or data risk, irreversible external effects, and unclear acceptance criteria.

Primary think discipline: `interview-me`. Research/discovery discipline: `wayfinder`.

Fact-vs-decision rule:

- if a question is about a fact the codebase or docs can answer, look it up first
- if a question is about intent, priorities, constraints, or tradeoffs, ask the user

Judge rule: see Escalation & Judge.

Suggested `brief.md` template:

```md
# Brief: <task name>

## Problem
<What problem are we solving? Why now?>

## Constraints
- <constraint>
- <constraint>

## Assumptions
- <assumption to validate>
- <assumption to validate>

## Acceptance Criteria
- [ ] <observable outcome>
- [ ] <observable outcome>

## Risks / Open Questions
- <risk or unresolved question>
- <risk or unresolved question>
```

The Brief should stay on the problem and decision surface. Do not turn it into an implementation plan.

#### OpenCode Planning Matrix

Every `/plan` invocation reads `brief.md` and produces `plan.md`. The Brief carries the design thinking; the Plan is the execution handoff.

**POC lanes:**

| Lane | Entry command | Conductor | Default path | Elevated path | Output |
|------|---------------|-----------|--------------|---------------|--------|
| Planning | `/plan` | `c9/cx/gpt-5.6-terra` | planner | planner + planner-adversarial + judge | `.agent-contexts/plan.md` |

Worker mandate split:

| Worker | Default mandate |
|--------|-----------------|
| `planner` | default design pass: architecture, codebase touchpoints, execution order |
| `planner-adversarial` | elevated design pass: failure modes, tradeoffs, hidden risk — what breaks, what's missed |
| `judge` | adjudicate worker outputs and return a final plan synthesis |

Escalation signals for design include ambiguous requirements, broad or cross-system touchpoints, auth/security impact, data-model changes, concurrency concerns, and workflow-critical code.

Judge rule: see Escalation & Judge.

Suggested `plan.md` template:

```md
# Plan: <task name>

## Goal
<One-paragraph restatement of what this plan will accomplish>

## Implementation Units

### U1: <unit name>
**Files:** <paths>
**Depends on:** <none or prior units>
**What to build:** <concrete scope>
**Verification:** <how this unit will be checked>

### U2: <unit name>
**Files:** <paths>
**Depends on:** U1
**What to build:** <concrete scope>
**Verification:** <how this unit will be checked>

## Verification Checklist
- [ ] <typecheck/lint/test/runtime check>
- [ ] <typecheck/lint/test/runtime check>

## Escalation Notes
- <why extra implementation or review rigor may be needed>
```

The Plan should stay on execution. It should not repeat the Brief's problem framing except where needed to keep implementation units intelligible.

Tracer-bullet rule:

- each implementation unit is a narrow but complete vertical slice through the relevant layers
- each unit is demoable or verifiable on its own
- do not split work into horizontal buckets like backend-first, frontend-later, tests-last

#### OpenCode Verify Matrix

Verification is a separate stage. It reads the current working tree and plan context, runs configured checks, and writes `verify.md`. It may also use browser/runtime tooling when the task demands user-facing verification.

Verifier escalation is operational rather than analytical:

- default to `c9/mino-v2.5`
- prefer one verifier path until evidence supports splitting it
- allow richer browser/runtime checks when the provider is connected to MCP tooling

#### OpenCode Review Matrix

Review always exists, but escalation is conditional. The conductor should start with the cheapest pass that matches the diff, then add adversarial review when the changed surface or risk profile warrants it.

**POC lanes:**

| Lane | Entry command | Conductor | Default path | Elevated path | Output |
|------|---------------|-----------|--------------|---------------|--------|
| Review | `/review` | `c9/cx/gpt-5.6-terra` | reviewer (DS V4 Pro) | reviewer + reviewer-adversarial (c9/cx/gpt-5.4) + judge | `.agent-contexts/review.md` |

Worker mandate split:

| Worker | Default mandate |
|--------|-----------------|
| `reviewer` | default review pass: Standards + Spec |
| `reviewer-adversarial` | elevated review pass: invariants, auth, data, concurrency — applied across Standards and Spec when warranted |
| `judge` | adjudicate worker reports and return final synthesis with confidence |

Review reads the Brief, the Plan, the code or diff, and the verifier report if present.

Primary review axes:

- **Standards** — repo conventions plus a Fowler smell baseline when repo standards are silent
- **Spec** — does the change conform to the Brief and Plan

Fowler baseline belongs in review, not the act loop. It is a heuristic backstop when repo standards are weak, not a reason for the implementer to widen scope during execution.

Review findings must cite `file:line` and use P0-P3 severity.

Escalation signals for review include auth or permission logic, billing or irreversible external effects, migrations or data integrity risk, concurrency or async coordination, workflow-orchestrator changes, unusually large diffs, and missing or weak verification evidence.

Judge rule: see Escalation & Judge.

#### OpenCode Command Architecture

Commands are optional explicit lane entrypoints, not the only way in. All commands target `agent: conductor` and declare a lane + artifact; the conductor prompt owns the orchestration logic. But the conductor is the everyday surface — when the user just talks to it, it runs the same lanes inline (idea/think/plan/act/verify/review) and handles most work directly without a command. Reach for a command only when you want to force a specific lane.

**POC commands:**

| Command | Agent | Expected behavior |
|---------|-------|-------------------|
| `/think` | `conductor` | think through the task, choose think rigor, and write `.agent-contexts/brief.md` |
| `/plan` | `conductor` | read `.agent-contexts/brief.md`, choose planning rigor, and write `.agent-contexts/plan.md` |
| `/act` | `conductor` | dispatch typist → dispatch verifier → if fail, typist fixes → repeat. Stop after 3 consecutive verify failures and surface blocker |
| `/verify` | `conductor` | dispatch verifier: typecheck, lint, tests → `.agent-contexts/verify.md` |
| `/review` | `conductor` | read brief, plan, code, and verifier evidence if present. Choose review rigor; default to reviewer, escalate to reviewer + reviewer-adversarial + judge when warranted |

Escalation is decided by the conductor at runtime from task risk and ambiguity, not by a separate high-lane command. Shared skills carry the escalation rubric.

#### OpenCode Permission Architecture

Permissions are intentionally light for POC: the conductor and implementer get `edit`; all other subagents are `edit: deny` with `bash: allow`. No granular allowlists — prompt prose ("do not edit any files", "return output to the conductor") is the primary control surface, consistent with CE's zero-permission review pipeline.

| Agent type | Permission stance | Phase |
|-----------|-------------------|-------|
| Conductor | edit + bash + task | POC |
| Implementer | edit + bash | POC |
| All other subagents | edit denied; bash allowed | POC |

Revisit tighter permissions only after the loop shape stabilizes.

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
  brief.md                # /think output (Brief)
  plan.md                 # /plan output (Execution plan)
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

States: `thinking | briefing | planning | acting | verifying | reviewing | complete | abandoned`.

Project is resolved from `git remote get-url origin`, slugified. Overridable via `APM_CONTEXT_DIR` env — point to a shared folder for cross-repo orchestration. The project prefix keeps sessions isolated when multiple repos share a context directory.

##### Checkpoint Contract

| Stage | Artifacts on disk | What survives |
|-------|-------------------|---------------|
| Think | `brief.md` | Brief produced by the conductor (think is a conductor mode, not a worker) |
| Plan | `plan.md`, `runs/<run-id>/` — planner.md, planner-adversarial.md, judge-synthesis.md | Execution plan plus planning worker outputs |
| Act | `runs/<run-id>/` — typist diff, verifier output | each attempt's diff and pass/fail |
| Verify | `verify.md` | latest verification evidence |
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

Target direction across providers:

- thin provider agents as the shell for model pinning and permissions
- shared skills as the reusable behavior layer

That pattern should be portable to Claude, Codex, and Kiro even when each adapter has different native constraints.

Kiro should follow the same adapter rule: keep provider mechanics under `config/providers/kiro/`, keep reusable behavior in `.agents/skills/`, and use Kiro custom-agent config only as the thin binding layer that loads those shared skills.

Target Kiro CLI v3 specifically. The Kiro binding should follow v3 agent-config, permissions, hooks, and spec conventions rather than older CLI patterns.

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

OpenCode only. POC proves the conductor can drive think, brief, plan, act, verify, and review end-to-end while choosing escalation based on task risk and ambiguity.

### Files created

Agents and commands live under `config/providers/opencode/` and are installed globally by `apm`. The authoritative agent roster (names, models, permissions, mandates) is the [OpenCode Workflow Roles](#opencode-workflow-roles) matrix; the command surface is the [OpenCode Command Architecture](#opencode-command-architecture) table. See those sections for the current file list.

### Install scope

Extend `src/providers/opencode/index.ts` to symlink `config/providers/opencode/agents/*.md` → `~/.config/opencode/agents/` and `config/providers/opencode/commands/*.md` → `~/.config/opencode/commands/`. Provider config and MCP merge stay as-is.

### Test order

1. `/think` against a real problem — produce a usable brief
2. `/plan` from that brief — produce a usable execution plan
3. `/review` against a real diff — validate review path and escalation
4. `/verify` — standalone verifier
5. `/act` — implement + verify loop

### What stays for MVP

After POC validates the loop:

| Deliverable | Phase |
|------------|-------|
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
- 2026-07-08: Revised the workflow shape to `think -> brief -> plan -> act -> verify -> review`, dropped `design.md` and `plan-writer`, made the Brief the design-thinking artifact, and documented CE-inspired but lighter escalation for solo-dev cost constraints.
- 2026-07-09: Folded `thinker` into the conductor (think is a mode, not a worker); dropped all `-x` high-lane variants and high-role rows; conductor now chooses escalation at runtime with shared skills carrying the rubric. Reframed commands as optional lane shortcuts (conductor is the everyday surface). Added Superpowers as related-work reference and the third-path positioning. De-duplicated the doc (single Escalation & Judge section; file tables are now pointers to the role matrix).

## References

- [OpenCode Agents](https://opencode.ai/docs/agents/)
- [OpenCode Commands](https://opencode.ai/docs/commands/)
- [OpenCode Formatters](https://opencode.ai/docs/formatters/)
- [OpenCode Permissions](https://opencode.ai/docs/permissions/)
- [Kiro CLI v3 overview](https://kiro.dev/docs/cli/v3/)
- [Kiro CLI v3 agent config](https://kiro.dev/docs/cli/v3/agent-config/)
- [Kiro CLI v3 permissions](https://kiro.dev/docs/cli/v3/permissions/)
- OpenCode agent, command, permission, and formatter documentation

## Upstream Inspirations

The workflow borrows selectively from three external efforts. The architecture-learnings assessment (`docs/assessments/2026-07-08-poc-workflow-architecture-learnings.md`) records exactly what was taken from each.

- [Compound Engineering plugin](https://github.com/EveryInc/compound-engineering-plugin) — conditional escalation, diff-driven persona selection, prompt-prose permission posture
- [firstmate](https://github.com/kunchenguid/firstmate) — convergent validation of the single-front-door conductor pattern; not a heavy borrow
- [Matt Pocock's skills](https://github.com/mattpocock) — wayfinder ambiguity resolution, tracer-bullet planning, two-axis Standards/Spec review, fact-vs-decision rule
- [Superpowers](https://github.com/obra/superpowers) — related-work reference (portable skills library + fixed methodology); we chart a more dynamic third path between it and the Compound Engineering plugin
- [SmallHarness](https://github.com/GetSmallAI/SmallHarness) — dynamic per-task model tiering, rubric-scored critic loop, overnight auto-run with context-reset; routing/evaluation reference
- [Oh My Pi](https://github.com/can1357/oh-my-pi) — richer execution surface, role-based routing with fallback chains, real-time advisor model, typed subagent yields; post-POC eval reference; borrow its tool-design lessons now (hash-anchored edits, summarized reads)
