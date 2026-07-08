# POC: Conductor Loop

## Goal

Prove the conductor loop works end-to-end in OpenCode for:

- idea escalation when a task is too ambiguous to safely brief
- `think -> brief`
- `plan -> plan`
- `act -> verify` retry loop
- `review` against plan, code, and verification evidence

This document is the implementation source of truth for the current POC. Use it to correct the workspace toward the current workflow shape.

## Workflow

```text
idea -> think -> plan -> act -> verify -> review
```

### Stage outputs

- `idea` — optional upstream ambiguity-resolution stage; no fixed POC artifact yet
- `think` — writes `.agent-contexts/brief.md`
- `plan` — writes `.agent-contexts/plan.md`
- `verify` — writes `.agent-contexts/verify.md`
- `review` — writes `.agent-contexts/review.md`

### Judge rule

- If exactly one substantive worker ran, the conductor finalizes the artifact directly
- If two or more substantive workers ran, the conductor dispatches `judge` to synthesize before writing the artifact

Judge is not always-on. It exists to reconcile multiple worker outputs, not to polish a single output.

## Architecture

The conductor is the custom primary agent. Commands select the conductor with lane context. The conductor owns:

- stage selection
- escalation policy
- worker fan-out
- judge handoff when needed
- artifact writes
- act retry loop

For this POC, agents remain the provider-level shell for model pinning and permission posture. The direction after the loop is proven is to keep those agent profiles thin and defer more reusable behavior to shared skills.

```text
/think  -> conductor -> [interview-me style think path, optional thinker workers] -> brief.md
/plan   -> conductor -> planner (+ planner-adversarial if needed) -> (judge if 2+) -> plan.md
/act    -> conductor -> typist -> verifier -> retry/escalate loop
/verify -> conductor -> verifier -> verify.md
/review -> conductor -> reviewer (+ reviewer-adversarial if needed) -> (judge if 2+) -> review.md
```

## Artifact contracts

### `brief.md`

The Brief is the design-thinking artifact. It captures intent and decision pressure, not implementation sequencing.

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

### `plan.md`

The Plan is the execution handoff. Use tracer-bullet discipline: each implementation unit must be a narrow but complete vertical slice through the relevant layers, demoable or verifiable on its own.

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

### `verify.md`

Verification report covering the checks run, pass/fail status, and enough output to diagnose failures.

### `review.md`

Review report grounded in the Brief, Plan, code/diff, and verification evidence if present.

## File inventory

### Agents — `config/providers/opencode/agents/`

Permission posture for POC:

- conductor: `edit: allow`, `bash: allow`, `task: allow`
- typist: `edit: allow`, `bash: allow`
- planner, planner-adversarial, verifier, reviewer, reviewer-adversarial, judge: `edit: deny`, `bash: allow`

Do not expand per-agent allowlists during POC unless a real safety boundary requires it. Prove the loop first.

Required POC agents:

| File | Mode | Model | Purpose |
|------|------|-------|---------|
| `conductor.md` | primary | `c9/cx/gpt-5.4` | owns orchestration, escalation, artifact writes, act retry loop |
| `planner.md` | subagent | `c9/deepseek-v4-pro-fusion` | default planning pass |
| `planner-adversarial.md` | subagent | `c9/kiro-claude-sonnet` | elevated planning risk pass |
| `typist.md` | subagent | `c9/minimax-m3` | default implementer |
| `verifier.md` | subagent | `c9/mino-v2.5` | unified verifier for code and runtime/browser evidence |
| `reviewer.md` | subagent | `c9/deepseek-v4-pro-fusion` | default review pass |
| `reviewer-adversarial.md` | subagent | `c9/kiro-claude-sonnet` | elevated review risk pass |
| `judge.md` | subagent | `c9/cx/gpt-5.5` | synthesis when 2+ worker outputs exist |

Optional POC agent if the implementation uses a dedicated thinker rather than conductor-only thinking:

| File | Mode | Model | Purpose |
|------|------|-------|---------|
| `thinker.md` | subagent | `c9/deepseek-v4-pro-fusion` | optional think-stage worker |

Removed from the current POC shape:

- `plan-writer.md`
- any `design.md` artifact contract

### Commands — `config/providers/opencode/commands/`

Required POC commands:

| File | Agent | Behavior |
|------|-------|----------|
| `think.md` | conductor | think through the task, choose think rigor, write `.agent-contexts/brief.md` |
| `plan.md` | conductor | read `.agent-contexts/brief.md`, choose planning rigor, write `.agent-contexts/plan.md` |
| `act.md` | conductor | dispatch typist -> verifier -> retry/escalate loop |
| `verify.md` | conductor | dispatch verifier -> `.agent-contexts/verify.md` |
| `review.md` | conductor | read brief, plan, code, and verifier evidence, choose review rigor, write `.agent-contexts/review.md` |

Removed from the current POC shape:

- `plan-write.md`

### Code change

`src/providers/opencode/index.ts` already carries the required install/check shape for agent and command symlinks. The current POC does not require a new provider-code change beyond keeping the source file inventory aligned with the docs.

## Install / check behavior

### Install sequence

1. Merge provider section into global OpenCode config
2. Merge MCP section
3. Ensure `~/.config/opencode/agents/` exists
4. Ensure `~/.config/opencode/commands/` exists
5. Symlink each file in `config/providers/opencode/agents/*.md` into `~/.config/opencode/agents/`
6. Symlink each file in `config/providers/opencode/commands/*.md` into `~/.config/opencode/commands/`

### Check sequence

1. Validate merged provider section
2. Validate merged MCP section
3. Verify each managed agent file is a symlink to repo source
4. Verify each managed command file is a symlink to repo source

For POC, do not prune unmanaged files, handle merge conflicts, or support downstream customization.

### Operational note: stale runtime files

`apm providers install` now prunes stale managed OpenCode symlinks for agents and commands before relinking.

Implication for this POC:

- removing `plan-write.md` from the repo source now removes the stale managed runtime symlink under `~/.config/opencode/commands/` on the next install
- removing `plan-writer.md` from the repo source now removes the stale managed runtime symlink under `~/.config/opencode/agents/` on the next install

This prune is intentionally narrow. It removes only managed symlinks that point back into the repo-managed OpenCode source directories and are now missing or no longer managed. It does not remove unrelated runtime files or foreign symlinks.

## Conductor contracts

### Idea stage

`idea` is optional and upstream of `think`.

Use it when the task is too ambiguous to safely write a Brief. The likely future adoption path is tracked investigation tickets, but full tracker-backed wayfinding is not required for POC.

POC rule:

- if the task is clear enough, skip `idea`
- if the task is still foggy after initial inspection, stop and surface that the user should run an idea-stage investigation rather than force a bad Brief

### Think stage

`think` produces `brief.md`.

Before normal think behavior, the conductor should detect recovery-style prompts whose latent intent is re-orientation after context decay. In that case, reconstruct working context first from repo state and existing artifacts, then decide whether a fresh Brief or Plan is actually needed.

Primary discipline: `interview-me`.

Required behavior:

- hypothesis first
- explicit confidence
- one question at a time
- each question carries a guess
- explicit restate and explicit confirmation

Fact-vs-decision rule:

- if a question is about a fact the codebase or docs can answer, look it up first
- if a question is about intent, priorities, constraints, or tradeoffs, ask the user

Recovery rule:

- for prompts like "what did we do", "where are we", or similar, inspect branch, worktree, recent commits, diff, and any existing `.agent-contexts/*` artifacts first
- synthesize what was being attempted, what is in flight, what is blocked, and the next sensible move
- do not write a new artifact by default for recovery requests

Escalation signals:

- ambiguous requirements
- broad scope
- product-semantics decisions
- auth or data risk
- irreversible external effects
- unclear acceptance criteria

Judge rule:

- one thinker or conductor-only thinking: conductor writes `brief.md`
- two or more thinker outputs: judge synthesizes the final `brief.md`

### Plan stage

`plan` reads `brief.md` and writes `plan.md`.

Required behavior:

- use tracer-bullet implementation units
- avoid horizontal slices by layer or file type
- include verification intent per unit

Escalation signals:

- ambiguous requirements
- broad or cross-system touchpoints
- auth/security impact
- data-model changes
- concurrency or orchestration risk
- unclear verification path

Judge rule:

- one planner: conductor writes `plan.md` from the planner output
- two or more planning workers: judge synthesizes before the conductor writes `plan.md`

### Act stage

Default implementer: `typist` on `c9/minimax-m3`.

Default loop:

1. Dispatch typist with `plan.md`
2. Typist implements and performs a self-check against:
   - `brief.md` constraints
   - `brief.md` acceptance criteria
   - `plan.md` implementation units
3. Dispatch verifier
4. If verify passes: done
5. If verify fails: pass verifier output back to typist and retry

Escalate implementer to Sonnet when:

- typist takes too many turns without converging
- verifier bounces the change back repeatedly
- the user explicitly requests Sonnet

Starter thresholds for POC:

- 2 implementation retries without meaningful progress, or
- 2 verifier failures, or
- explicit user override

After escalation, the conductor may switch the implementer model for the next attempt.

### Verify stage

Verifier model: `c9/mino-v2.5`.

Keep one verifier path until evidence supports splitting it.

Required behavior:

- run typecheck, lint, tests when configured
- collect enough output to diagnose failures
- support runtime/browser evidence when connected tooling exists
- write `.agent-contexts/verify.md`

### Review stage

`review` reads:

- `brief.md`
- `plan.md`
- code or diff
- `verify.md` if present

Primary review axes:

- **Standards** — repo conventions plus a Fowler smell baseline when repo standards are silent
- **Spec** — does the change conform to the Brief and Plan

Adversarial review is an elevated pass across those axes when warranted. It is not the primary review axis.

Escalation signals:

- auth or permission logic
- billing or irreversible external effects
- migrations or data integrity risk
- concurrency or async coordination
- workflow-orchestrator changes
- unusually large diffs
- missing or weak verification evidence

Judge rule:

- one reviewer: conductor writes `review.md` directly
- two or more reviewer outputs: judge synthesizes before the conductor writes `review.md`

Review findings must cite `file:line` and use P0-P3 severity.

## .agent-contexts creation

The conductor creates `.agent-contexts/` if it does not exist before writing any artifact. No subagent creates this directory.

## Install verification

```bash
pnpm build && ./apm providers install
ls -la ~/.config/opencode/agents/
ls -la ~/.config/opencode/commands/
```

## Test order

1. `/think` against a real problem — produce a usable brief
2. `/plan` from that brief — produce a usable execution plan
3. `/review` against a real diff — validate review path and escalation
4. `/verify` — standalone verifier
5. `/act` — implement + verify loop

## Acceptance criteria

- `/think`: produces `brief.md`; facts are looked up instead of asked when available; explicit restate and confirmation occur
- `/plan`: produces `plan.md`; implementation units are tracer-bullet vertical slices
- `/review`: reads brief, plan, code, and verification evidence; default review works with one reviewer; elevated review uses adversarial pass and judge only when multiple worker outputs exist
- `/verify`: runs configured checks and writes a usable `verify.md`
- `/act`: typist implements, self-checks against brief + plan, verifier runs, retries on failure, escalates implementer when needed, stops after bounded retries

## Revision notes

- 2026-07-08: Rewrote the POC plan to match the current workflow shape: `idea -> think -> plan -> act -> verify -> review`; removed `design.md` and `plan-writer`; made judge conditional on 2+ worker outputs; made `interview-me` the think-stage discipline; adopted tracer-bullet planning, unified verifier on `mino-v2.5`, and review grounded in Brief + Plan + code + verification evidence.
