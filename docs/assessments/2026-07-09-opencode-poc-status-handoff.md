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
- keep shared behavior in `.agents/skills/` and bind it separately in OpenCode and Kiro
- use conductor as an everyday direct profile, with dispatch only when specialization helps

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

More broadly, conductor is intended to be usable as the daily profile:

- handle small clear requests directly
- use recovery behavior directly for re-orientation requests
- dispatch workers when specialization, adversarial analysis, or independent verification adds value
- do not force the full workflow ceremony on every ask

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

## Shared-skill direction

Provider portability is now clearer:

- shared behavior should live under `.agents/skills/`
- `config/providers/opencode/` should stay the OpenCode binding layer
- `config/providers/kiro/` should become the Kiro binding layer
- Kiro should not get a separate workflow architecture; it should load the same shared skills through thin custom-agent config
- the Kiro binding should target CLI v3 conventions, not older Kiro CLI patterns

Near-term extraction targets for cross-provider testing:

- `recovery-orientation`
- `review-standards-spec`
- `review-adversarial-risk`

These have now been created under `.agents/skills/` as the shared source-of-truth layer.

Skill-writing guidance was also revisited against Matt Pocock's `writing-great-skills` reference. The main adoption was to make skills more process-predictable:

- clearer invocation surface
- step/reference hierarchy instead of prose-only explanation
- checkable completion criteria per step
- less descriptive text that does not change agent behavior

The stable interface should be the skill contract, not any one provider's agent file format.

## Kiro review-agent status

Kiro work stayed review-first. We did not port the conductor loop.

### Goal

Bind the shared review skills into Kiro CLI v3 with the thinnest possible provider-specific layer so review behavior is portable between OpenCode and Kiro.

### Shared source of truth

Keep review behavior in:

- `.agents/skills/engineering/review-standards-spec/SKILL.md`
- `.agents/skills/engineering/review-adversarial-risk/SKILL.md`
- `.agents/skills/engineering/recovery-orientation/SKILL.md`

Kiro should consume these as shared behavior, not duplicate their prose into Kiro-only instructions.

### Provider binding shape

Repo source:

```text
config/providers/kiro/
  agents/
    reviewer.json
    reviewer-adversarial.json
```

Runtime target:

```text
~/.kiro/agents/
~/.kiro/skills/
```

or workspace `.kiro/` when explicitly testing locally.

These agent files now exist and are installed by `apm`.

### Kiro v3 config direction

Use Kiro CLI v3 custom-agent JSON config:

- JSON custom-agent files under `~/.kiro/agents/`
- `tools` are the built-in Kiro tool names
- `resources` should load shared skills
- `toolsSettings.shell` should stay read-only in practice

Minimal review-agent shape:

- `reviewer.json`
  - description: Standards + Spec review
  - model: `claude-sonnet-4`
  - tools: enough for read/search/shell review work
  - resources:
    - shared review skill
  - shell commands limited to read-only git/repo inspection

- `reviewer-adversarial.json`
  - same thin shell
  - loads `review-adversarial-risk`
  - same read-only posture

### Permission stance

Keep the same semantic contract as OpenCode:

- reviewers are non-editing
- read and repo inspection are allowed
- keep the shell allowlist narrow and read-only

Map this into Kiro v3 custom-agent config, not older CLI patterns.

### What not to do

- do not port the whole conductor
- do not build Kiro-only review behavior
- do not let `.kiro/skills/` become the source of truth
- do not overfit to Kiro features before proving that the shared review skills behave well there

### What was implemented

Completed:

1. Added repo source files:

```text
config/providers/kiro/agents/
  reviewer.json
  reviewer-adversarial.json
```

2. Extended `src/providers/kiro.ts` so provider install/check now:

- installs shared skills into `~/.kiro/skills/`
- installs provider-managed Kiro agent files into `~/.kiro/agents/`
- checks both sets of links
- prunes stale managed Kiro agent symlinks

3. Fixed provider command routing so `./apm providers install` and `./apm providers check` run the full provider registry, not only OpenCode.

Bug found during verification:

- `src/providers/opencode/sync.ts` was hardcoded to the OpenCode provider only
- result: Kiro provider code existed but never ran from `apm providers install/check`
- fix: iterate the provider registry instead of selecting only `opencode`

4. Kept code change minimal for shared skills:

- do not broaden skill discovery code
- instead move shared extracted skills into a real category under `.agents/skills/engineering/`

### Suggested next test order

1. Install shared skills into Kiro runtime
2. Bind `reviewer.json` to `review-standards-spec`
3. Bind `reviewer-adversarial.json` to `review-adversarial-risk`
4. Run review on a real diff in Kiro v3
5. Compare output quality and tone against OpenCode
6. Only then decide whether Kiro needs extra steering or hooks

### Why this order

Review is the cleanest portability test:

- strong shared skill contract already exists
- no need to port full orchestration
- easy to compare behavior across runtimes
- low risk of Kiro-specific workflow drift

### What does not need to happen yet:

- no full Kiro conductor binding
- no Kiro hook system work
- no Kiro spec workflow integration
- no provider-wide abstraction rewrite unless the first agent binding exposes a real duplication problem

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
- `./apm providers install` — passes
- `./apm providers check` — passes
- stale runtime symlinks for removed files confirmed gone after install
- Kiro runtime links verified:
  - `~/.kiro/agents/reviewer.json`
  - `~/.kiro/agents/reviewer-adversarial.json`
  - `~/.kiro/skills/review-standards-spec`
  - `~/.kiro/skills/review-adversarial-risk`
  - `~/.kiro/skills/recovery-orientation`

Not yet verified:

- actual Kiro CLI runtime behavior on a real diff
- whether the loaded `resources` skill context in Kiro produces the same review quality and tone as OpenCode

## Useful review questions

- Does the conductor prompt cleanly separate lane routing from reusable behavior?
- Are the reviewer prompts aligned with the intended Standards + Spec model?
- Is the learnings doc the right balance of concrete and general?
- Does recovery behavior belong only in conductor prose, or should some of it become a reusable skill?
- Any remaining mismatches between repo source and `~/.config/opencode/` install state?
