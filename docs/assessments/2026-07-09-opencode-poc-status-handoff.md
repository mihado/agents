# OpenCode POC Status Handoff

Date: 2026-07-09

This is a collaboration note for the next agent picking up this work. What changed from the last external-pattern assessment phase to the current OpenCode POC state.

## High-level shift

We moved from comparing external workflow patterns to encoding the OpenCode POC directly in provider config, conductor prompts, install behavior, and workflow docs.

Current direction:

- keep agents as the provider shell for model pinning, permission posture, and lane routing
- move toward thinner agents and more reusable skills over time
- avoid premature permission hardening during POC
- prove the conductor loop end-to-end first

## Workflow shape

```
idea → think → plan → act → verify → review
```

- `idea` is optional and upstream of `think` — stop and surface fog rather than force a bad Brief
- `think` produces `brief.md` (problem, constraints, assumptions, acceptance criteria, risks)
- `plan` reads brief and produces `plan.md` (tracer-bullet units with blocking edges)
- `act` implements, self-checks against brief + plan, then verifier runs
- `verify` is a separate QA lane — typecheck, lint, tests, runtime/browser
- `review` reads brief, plan, code, and verify evidence — two axes: Standards + Spec, adversarial as elevation

Judge rule: 1 substantive worker = conductor finalizes directly. 2+ workers = judge synthesizes before artifact write. Judge is not always-on.

## Disciplines adopted

- fact-vs-decision rule in think (inspect facts first, ask for intent)
- tracer-bullet planning (vertical slices, demoable standalone)
- Standards + Spec as primary review axes
- typist self-checks against brief + plan before verify
- Fowler smell baseline in review only, not act
- interview-me as think discipline

## Agent/command surface

Agents (8 required + 1 optional):
- `conductor`, `planner`, `planner-adversarial`, `typist`, `verifier`, `reviewer`, `reviewer-adversarial`, `judge`
- `thinker` (optional, for elevated think)

Commands (5):
- `/think`, `/plan`, `/act`, `/verify`, `/review`

Removed: `plan-writer` agent, `plan-write` command, any `design.md` artifact.

## Permission posture

All subagents: `edit: deny`, `bash: allow`. No granular allowlists. Conductor and typist keep `edit: allow`. Prompt prose is the control surface for POC.

## Conductor recovery behavior

Latent-intent recovery is in the conductor prompt (not a separate command). For prompts like "where are we," "catch me up," "what did we do" — the conductor inspects branch, status, commits, diff, and all `.agent-contexts/` artifacts, then synthesizes working context and next move. Recovery requests do not write new artifacts by default.

## Additional orchestration signal

firstmate validated several orchestration patterns that fit our conductor direction even though we do not want its worktree/session machinery:

- one user-facing orchestrator
- durable state as canonical truth
- recovery as reconciliation rather than restart
- escalate only actionable state changes
- report outcomes rather than internal worker mechanics by default

We do not want to copy firstmate's worktree-heavy runtime shape. The useful borrow is the orchestration discipline.

## Emerging durability gap

The live collaboration pattern also exposed a missing primitive: durable persona-level records.

The important distinction is not provider runtime (`opencode`, `kiro`, etc.). The important distinction is the agent persona and mandate.

Examples:

- DeepSeek exploratory thinker log
- OpenCode conductor synthesis log
- reviewer-adversarial findings log
- planner log

Potential future direction:

- keep canonical workflow artifacts (`brief.md`, `plan.md`, `verify.md`, `review.md`)
- add persona-scoped append-only logs for major conclusions, evidence, reversals, and unresolved questions
- later add a clerk/compactor pass to trim legacy or superseded entries

This would preserve collaborative reasoning across multiple personas without overloading the main workflow artifacts.

## Install/check

Install now prunes stale managed symlinks before relinking (handles removed files like plan-write.md). Check validates existing links point to repo source. Broken stale symlinks were missed before — fixed via `lstatSync` in prune logic.

## Docs aligned

- `docs/provider-workflow.md` — canonical architecture
- `docs/plans/2026-07-08-001-poc-conductor-loop.md` — implementation source of truth
- `docs/assessments/2026-07-08-poc-workflow-architecture-learnings.md` — condensed single reference covering fragmentation signals and external pattern learnings

## What's left untracked

- `docs/assessments/2026-07-08-kiro-codex-provider-risk-assessment.md` — not committed, still thinking through kiro-codex routing implications
- `.agents/skills/calibrated/` — new skill drafts, not ready

## Verification performed

- `pnpm build` — clean
- `eslint src/` — no issues
- `vitest run` — 79/79 passing
- `./apm providers install` — passes
- `./apm providers check` — passes
- stale runtime symlinks for removed files confirmed gone after install

## Useful review questions

- Does the conductor prompt cleanly separate lane routing from reusable behavior?
- Are the reviewer prompts aligned with the intended Standards + Spec model?
- Is the learnings doc the right balance of concrete and general?
- Does recovery behavior belong only in conductor prose, or should some of it become a reusable skill?
- Any remaining mismatches between repo source and `~/.config/opencode/` install state?
