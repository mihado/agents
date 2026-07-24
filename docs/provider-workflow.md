# Provider Workflow

Date: 2026-07-13

This repository is the source of truth for a user-global agent workflow: shared skills, provider bindings, and the `apm` install/check path that makes them reproducible across machines. It does not contain project-scoped agents.

OpenCode is the reference harness because it exposes explicit agent roles, model pins, permissions, commands, and subagent dispatch. Claude, Codex, and Kiro are adapters: they preserve workflow semantics where their harnesses allow them, but do not redefine the contract.

## Workflow at a Glance

The workflow is a thin dispatcher over focused skills, not a fixed agent topology or universal skill bundle.

```text
user request
  -> conductor chooses a lane and rigor
  -> stable lane owner + applicable supporting practices
  -> explicit artifact or evidence result
```

```text
idea -> think -> plan -> act -> verify -> review
```

The conductor is the everyday front door; commands are optional ways to select a lane. Small clear work may stay lightweight, but follows the same authority and evidence boundaries.

[`wf-conductor`](../.agents/skills/workflow/wf-conductor/SKILL.md) is the authoritative executable contract for routing, escalation, artifact authority, recovery, and retries.

| Lane | Workflow owner | Result |
| --- | --- | --- |
| Idea | conductor | Intent, scope, and constraints are settled before a Brief. |
| Think | conductor | `.agent-contexts/brief.md` |
| Plan | `wf-planning` or `wf-research` | `plan.md`, or bounded research artifacts. |
| Act | `wf-execution` | Approved work and an Operator Handoff. |
| Verify | `wf-verification` | `verify.md` with `PASS`, `FAIL`, `INCOMPLETE`, or `BLOCKED`. |
| Review | `wf-review` | Standards/Spec findings with `file:line`; never a verification verdict. |
| Ship | conductor | Explicit release request with rollback and operational proof. |

Lane ownership is fixed. Workers may select applicable practice skills inside their assigned lane and record material use, but return any change to scope, acceptance criteria, safety boundaries, or mandatory evidence to the conductor.

## Workflow Kernel and Practices

The workflow kernel is owned by this repository. It defines lane authority, artifacts, statuses, evidence floors, and escalation. Practice skills are optional methods selected within that boundary: they may strengthen evidence but cannot change the workflow contract. Provider adapters may change model routing, permissions, commands, and agent files, not kernel authority.

### Workflow kernel

| Skill | Lane | Mode / boundary |
| --- | --- | --- |
| `wf-conductor` | all | Shared control contract. Owns routing, artifacts, recovery, and bounded retries; no practice catalog. |
| `wf-planning` | execution Plan | `execution` writes `plan.md`; `adversarial` pressure-tests broad, security-sensitive, data, concurrency, operational, or unclear-verification work. |
| `wf-research` | research Plan | `research` gathers bounded decision evidence; `adversarial` seeks contrary evidence. Writes research artifacts, never `plan.md`. |
| `wf-execution` | Act | Applies approved, bounded units and returns an Operator Handoff. |
| `wf-verification` | Verify | Sole owner of `PASS`, `FAIL`, `INCOMPLETE`, and `BLOCKED`. |
| `wf-review` | Review | `standards-spec` by default; `adversarial-risk` for auth, data, concurrency, broad, or high-risk diffs. |
| `wf-judge` | synthesis | Reconciles worker reports only; the conductor owns the resulting lane artifact. |

Recovery is a progressive-disclosure branch of `wf-conductor`, not a separate workflow skill.

### Practice catalog

| Skill | Lane | Trigger / boundary |
| --- | --- | --- |
| `interview-me` | Idea / Think | Unresolved user intent, priorities, scope, or constraints. |
| `idea-refine` | Idea | Stress-test a candidate idea after basic intent is known. |
| `wayfinder` | Idea | Large or explicitly requested discovery; not routine Think work. |
| `source-driven-development` | Think / Plan / conditional Act | Ground a current library, SDK, service, or upstream fact; Act escalates if it invalidates the settled route. |
| `spec-driven-development` | Think | Requirements remain materially incomplete after discovery. |
| `api-and-interface-design` | Plan / conditional Act | Public API or module contract; Act implements, not redefines, the settled contract. |
| `domain-modeling` | Plan | Domain vocabulary, ownership, or boundary change. |
| `security-and-hardening` | Plan / conditional Act | Untrusted input, auth, storage, tenant boundary, or third-party integration. |
| `deprecation-and-migration` | Plan / conditional Act | System/API removal, user migration, or schema/data migration. |
| `ci-cd-and-automation` | Plan / conditional Act | Build, deployment, quality-gate, or CI pipeline change. |
| `hallmark` | execution Plan | Greenfield or full-page visual direction. |
| `impeccable` | execution Plan | Settled product UI, component craft, or frontend polish. |
| `frontend-ui-engineering` | execution Plan / Act | Settled UI implementation mechanics. |
| `test-driven-development` | conditional Act | Focused automated coverage is feasible; strengthens proof. |
| `incremental-implementation` | conditional Act | Multi-file or high-blast-radius work benefits from small verified slices. |
| `debugging-and-error-recovery` | conditional Act | Concrete failure or unexpected behavior needs root-cause analysis. |
| `performance-optimization` | conditional Act | A measured or explicit performance requirement applies. |
| `browser-testing-with-devtools` | Verify | The Plan requires browser proof and working tooling exists. |
| `code-review-and-quality` | Review | Extra multi-axis quality review is needed. |
| `shipping-and-launch` | Ship | Explicit production-launch request. |
| `observability-and-instrumentation` | Ship | Production visibility is required. |
| `git-workflow-and-versioning` | Ship | Explicit commit, release, tag, or versioning request. |

## Decisions, Evidence, and Artifacts

| Artifact or role | Owns | Does not own |
| --- | --- | --- |
| Brief | Outcome, scope, acceptance criteria, hard constraints, and non-functional requirements | Detailed implementation route or helper choices |
| Plan | Route, touchpoints, failure modes, evidence strategy, safeguards, suggested skills, and escalation conditions | An exhaustive implementation recipe or exclusive tool list |
| Operator | Implementation method and supporting-skill selection within an approved unit | Changing the outcome, route, mandatory evidence, or safety boundaries without escalation |

Non-functional requirements are outcome commitments in the Brief; mechanisms belong in the Plan or implementation. Plans recommend supporting skills but do not restrict the operator from adding tests or stricter proof.

Each execution unit declares scope, intent, dependencies, failure modes, evidence strategy, safeguards, suggested skills, and escalation conditions. Use the proof appropriate to the work: focused tests where feasible for behavior-bearing code; runtime, browser, manual, operational, or external proof when the Plan requires it. Plans name the lowest adequate evidence level for behavior-bearing code: unit, integration, browser/runtime, or operational. Static review may identify potential performance impact, but measured performance claims require declared measurement evidence. Missing declared proof is `INCOMPLETE`, never `PASS`.

Elevate planning or review for broad/cross-system work, auth or security impact, data or migration changes, concurrency risk, irreversible operations, or unclear verification. Act retries only a repairable `FAIL` with a concrete repair hypothesis and safe retry state. `INCOMPLETE` and `BLOCKED` stop for human disposition; the operator never declares `PASS`.

The conductor is the only workflow-artifact writer.

```text
.agent-contexts/
  brief.md
  plan.md
  verify.md
  review.md
  review-<timestamp>.md
  research/
    planner.md
    planner-adversarial.md
    synthesis.md
```

Research artifacts inform a later execution plan but never substitute for one. A research synthesis is stale when its decision question no longer matches the active Brief.

## OpenCode Reference Binding

OpenCode agent bindings own only provider concerns: model, permissions, and provider-specific return boundary. Workflow skills own reusable behavior.

### Dispatch pattern

The conductor dispatches a named worker and supplies `Required skill: wf-*`. OpenCode resolves the worker name to its binding under `config/providers/opencode/agents/`; the wrapper loads the named workflow skill and follows its contract.

When independent planning, research, or review reports need reconciliation, the conductor dispatches `judge` with `Required skill: wf-judge`. The judge receives only those reports; it does not inspect the original code, diff, or problem.

```text
conductor dispatch: operator + Required skill: wf-execution
  -> OpenCode resolves config/providers/opencode/agents/operator.md
  -> operator wrapper loads wf-execution
  -> wf-execution returns Operator Handoff

conductor dispatch: verifier + Required skill: wf-verification
  -> OpenCode resolves config/providers/opencode/agents/verifier.md
  -> verifier wrapper loads wf-verification
  -> wf-verification returns the verification verdict
```

The conductor knows stable agent and workflow-skill names, not provider model or permission settings. A provider binding must not restate or replace the workflow contract.

| Role | Agent | Model | Permissions | Responsibility |
| --- | --- | --- | --- | --- |
| Conductor | `conductor` | `c9/cx/gpt-5.6-terra` | edit + bash + task | lane selection, artifacts, escalation, retry loop |
| Planner | `planner` | `c9/deepseek-v4-pro-fusion` | read-only + bash | constructive execution or research planning |
| Adversarial planner | `planner-adversarial` | `c9/cx/gpt-5.6-terra` | read-only + bash | independent risk or contrary-evidence pass |
| Operator | `operator` | `c9/minimax-m3` | edit + bash | bounded approved execution |
| Verifier | `verifier` | `c9/mino-v2.5` | read-only + bash | independent evidence verdict |
| Reviewer | `reviewer` | `c9/deepseek-v4-pro-fusion` | read-only + bash | Standards + Spec review |
| Adversarial reviewer | `reviewer-adversarial` | `c9/cx/gpt-5.6-terra` | read-only + bash | auth, data, concurrency, and failure-mode review |
| Judge | `judge` | `c9/cx/gpt-5.6-sol` | read-only + bash | synthesize independent worker reports |

Model IDs are provider-qualified so subagents cannot silently inherit the parent model. The exact models may evolve; lane authority and evidence boundaries do not.

### Commands

| Command | Behavior |
| --- | --- |
| `/think` | Produce a Brief. |
| `/plan` | Produce an execution plan; `research` or `mode:research` produces research artifacts. |
| `/act` | Operator, verifier, and safe repair loop. |
| `/verify` | Standalone independent verification. |
| `/review` | Standards/Spec review with conditional adversarial elevation. |

Recovery requests such as “where are we?” reconstruct the goal, active work, artifact evidence, drift, and one next move from Git state and `.agent-contexts/`.

## Source, Installation, and POC Status

| Kind | Source of truth | Runtime target |
| --- | --- | --- |
| Shared instructions | repo root `AGENTS.md`, `CLAUDE.md` | linked into provider homes where needed |
| Shared skills | `.agents/skills/` | linked into provider homes where needed |
| Provider agents and commands | `config/providers/<provider>/` | provider-global home |
| Provider config | `config/providers/<provider>/` | provider-global config |

Provider runtime directories such as repo-root `.opencode/` or `.claude/` are installation targets, not workflow source.

`apm providers install` installs or links shared instructions, skills, agents, commands, configuration, and MCP entries. `apm providers check` verifies the runtime still points to managed source. `apm skills fetch -> review -> accept -> check` is the vendor supply chain. Restart OpenCode after installation or workflow changes because agents and skills load at startup.

The POC proves this routing model on OpenCode: Brief, plan, bounded execution, independent verification, conditional review, and recovery from artifacts. Deferred: validated browser automation, resumable checkpoints or autonomous loops, tracker-backed Wayfinder, complete Claude/Codex/Kiro parity, and production release automation.

Next, dogfood a small bug, multi-file feature, and settled UI task. Record the target revision, request, artifacts, commands, verdict, review disposition, and friction; turn recurring failures into tests or routing-contract checks.

## Supporting Records

| Document | Purpose |
| --- | --- |
| [`docs/assessments/2026-07-08-poc-workflow-architecture-learnings.md`](assessments/2026-07-08-poc-workflow-architecture-learnings.md) | Evolution, upstream comparisons, and decisions |
| [`wf-conductor`](../.agents/skills/workflow/wf-conductor/SKILL.md) | Executable conductor contract |
| `config/providers/opencode/agents/conductor.md` | OpenCode conductor binding |
| `.agents/skills/workflow/*` | Workflow-owner contracts |
| `.agents/skills/engineering/*` | Practice-discipline contracts |

## References

- [Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills)
- [Matt Pocock skills](https://github.com/mattpocock/skills)
- [Compound Engineering plugin](https://github.com/EveryInc/compound-engineering-plugin)
- [SmallHarness](https://github.com/GetSmallAI/SmallHarness)
- [Oh My Pi](https://github.com/can1357/oh-my-pi)
- [OpenCode agents](https://opencode.ai/docs/agents/)
- [OpenCode commands](https://opencode.ai/docs/commands/)
- [OpenCode permissions](https://opencode.ai/docs/permissions/)
