# Matt Pocock Skills Assessment

Date: 2026-07-08

Upstream: [mattpocock/skills](https://github.com/mattpocock/skills)

Evaluated at: HEAD (~v1.1.0, 161k stars)

## Context

Matt Pocock's skills repo uses an issue tracker as a persistence and planning surface for the larger workflow (wayfinder maps, ticket dependencies), but many of the individual skills are smaller and more composable than that description implies. There are no custom agents, no model pinning, no YAML frontmatter. Skills compose on the fly — the current model becomes the orchestrator when you type a command. Outputs are specs and tickets, not Briefs and Plans.

Our architecture is different by necessity: we need agent pinning for model routing, we need the conductor as a dedicated orchestrator, and our artifacts live in `.agent-contexts/`. But the *shapes* of Matt's stages — how he structures ambiguity, how he decomposes work into vertical slices, how he separates review axes — map cleanly onto ours. The adoption path should borrow the small disciplines, not imitate the tracker-centered operating model.

## Pipeline Mapping

| Our stage | Matt skill | Overlap | Gap / signal |
|-----------|------------|---------|--------------|
| **idea** | wayfinder | Creates investigation tickets (research, prototype, grilling, task) to resolve fog before anyone specs. Conductor decides whether the task needs this. Not every task does. | Matt has a formal fog-of-war model with blocking edges and ticket types. Our idea stage is aspirational. |
| **think → brief** | grill-me / grill-with-docs | Both pressure-test assumptions through structured interviews. Our primary discipline is `interview-me`, not Matt's grill. The useful Matt addition is the fact-vs-decision rule: if the codebase can answer a factual question, look it up instead of asking. Matt's grill also produces clarified intent + optional domain glossary + ADRs. | Matt's shared-language pattern (glossary, ADRs) is real and verified upstream. For us it's a later persistence enhancement to the Brief stage, not POC scope. |
| **plan** | to-tickets | Both produce ordered execution handoffs from design artifacts. Upstream to-tickets requires tracer-bullet vertical slices: "Each slice cuts a narrow but COMPLETE path through every layer," "A completed slice is demoable or verifiable on its own." Ours: implementation units with dependencies but no "must be demoable" constraint. | **POC adoption target.** Tracer-bullet discipline: each unit is a complete vertical cut, verifiable on its own. |
| **act** | implement | Matt: TDD-driven, typecheck during execution, code-review at end. No separate verify stage. Ours: typist → verifier loop, separated roles. Upstream implement is thin — TDD, typecheck, tests, review, commit. It does not prescribe self-check against acceptance criteria. | **Local design.** Our self-check (typist reads plan.md + brief.md, checks own diff, fixes gaps) is inferred from Matt's general discipline of checking work against the spec, not from a specific upstream template. |
| **verify** | (none) | Matt embeds mechanical checks in `/implement` as during-execution feedback. We run them as a separate QA pass. | Keep separate — faster feedback is nice but role conflating costs more than latency. |
| **review** | code-review | Upstream is explicit: two axes (Standards + Spec), parallel sub-agents, kept separate. "That's the reranking the separation exists to prevent." Our current workflow doc frames review as default reviewer + elevated adversarial — a different split. | **POC adoption target.** Shift to Standards + Spec as primary axes. Adversarial becomes elevation across both. Requires prompt rewrite on reviewer and reviewer-adversarial agent files — claim is proposed, not yet implemented. |

## What to Take for POC

### 1. Tracer-bullet discipline in plan.md

Each implementation unit must be a vertical slice through every layer — schema, logic, API, UI, tests — that is demoable or verifiable on its own. Not a horizontal grouping by file type. Verified from upstream to-tickets.

Affects: `planner.md` prompt, conductor plan lane protocol, `plan.md` template in `provider-workflow.md`.

### 2. Act self-check (local design, inferred from Matt's discipline)

Before the typist declares done, it reads `plan.md` acceptance criteria and `brief.md` constraints, checks its own diff against both, and fixes anything it missed. Then the verifier runs.

Catches spec mismatches before burning a verifier cycle. Upstream implement does not prescribe this explicitly — it delegates to `/code-review` at the end. This is our inference from Matt's broader pattern of checking work against the spec, not a direct borrowing from a specific upstream template.

Affects: `typist.md` prompt, conductor act lane protocol.

### 3. Review axes: Standards + Spec (proposed, not yet implemented)

Rewrite reviewer mandates to match upstream code-review's two-axis model:

- **reviewer** (default): correctness, regressions, repo conventions, Fowler smell baseline (Standards axis) AND brief/plan conformance (Spec axis)
- **reviewer-adversarial** (elevated): invariants, auth, data, concurrency — applied across both axes when the diff warrants it

The two axes are presented separately, not merged. This prevents one axis from masking the other — a change can pass correctness review while missing spec requirements, or match the spec while violating conventions.

This is a proposed prompt rewrite on `reviewer.md` and `reviewer-adversarial.md`. It has not yet been applied. The current prompts still reflect the constructive-vs-adversarial split.

### 4. Fowler smell baseline (embed in reviewer prompt)

A fixed set of Fowler code smells (*Refactoring*, ch.3) the reviewer carries even when a repo documents no coding standards:

Mysterious Name, Duplicated Code, Feature Envy, Data Clumps, Primitive Obsession, Repeated Switches, Shotgun Surgery, Divergent Change, Speculative Generality, Message Chains, Middle Man, Refused Bequest.

Each smell is a heuristic, not a hard violation. A documented repo standard overrides the baseline where they conflict. Verified from upstream code-review. Lightweight enough to paste into the reviewer prompt directly.

This belongs in review, not the act loop. The implementer should avoid obvious gratuitous complexity, but smell-policing is a review discipline, not an execution gate.

## What to Defer

### Wayfinder / idea stage

Fog-of-war investigation tickets are structurally clean but require either an issue tracker integration or a `.agent-contexts/idea/` directory convention. Not POC scope. Worth designing the conductor's escalation policy to accommodate: "When the task is too ambiguous for brief, create investigation tickets instead of force-spec'ing."

### Domain glossary / ADR (grill-with-docs)

Upstream README.md describes grill-with-docs as building `CONTEXT.md` and ADRs inline, delegating to `/grilling` plus `/domain-modeling`. This is a real adoption opportunity — Matt's strongest signal that isn't about execution — but it's a later persistence enhancement to the Brief stage, not POC workflow mechanics.

### Prototype / research sub-skills

Matt dispatches disposable code for design questions and background research with cited sources. Our thinker/conductor could dispatch these as investigation tools during think or idea. Useful later; POC needs think working end-to-end first.

## What to Skip

- **Issue tracker as state machine.** We use `.agent-contexts/` artifacts. Blocking-edge concept is portable without tracker integration.
- **No-agent architecture.** Matt's skills have no pinned models, no YAML frontmatter, no custom agents. We need agent pinning — OpenCode subagents inherit the parent model unless explicitly pinned.
- **`/setup-matt-pocock-skills` installer.** CLI-based setup for tracker, labels, doc paths. Our `apm providers install` handles the equivalent surface.

## Implementation Surface

Everything adopted for POC is a prompt change — no new agents, commands, or code:

| Change | Files touched | Type |
|--------|--------------|------|
| Tracer-bullet constraint | `planner.md`, conductor plan lane, plan template in `provider-workflow.md` | Prompt + doc |
| Act self-check | `typist.md`, conductor act lane | Prompt addition |
| Review axes + smell baseline | `reviewer.md`, `reviewer-adversarial.md` | Prompt rewrite (proposed, not yet applied) |
| Fowler smell baseline | `reviewer.md` | Prompt addition |
| Fact-vs-decision rule in think | conductor think lane, thinker/interview-me usage | Prompt + workflow guidance |

Zero changes to `src/providers/opencode/index.ts`, agent file count, or command file count.

## References

- [mattpocock/skills](https://github.com/mattpocock/skills) — assessed at HEAD, 2026-07-08
- `docs/provider-workflow.md` — canonical workflow contract, revision 2026-07-08
- `docs/assessments/2026-06-07-compound-engineering-plugin.md` — prior CE assessment
- `docs/assessments/2026-07-08-permission-posture-and-ce-plugin-pattern.md` — permission posture assessment

## Revision Notes

- 2026-07-08: Initial assessment. Written after deep review of wayfinder, to-spec, to-tickets, implement, code-review, grill-with-docs, prototype, and research skills.
- 2026-07-08: Revised per review feedback. Fixed stale file-touch list (removed plan-writer.md), labeled review axes as proposed-not-implemented, clarified tracker is a planning surface not the whole OS, marked act self-check as local design inferred from Matt's discipline, recast domain glossary as Brief-stage persistence enhancement, kept `interview-me` as the primary think discipline, and placed the Fowler baseline in review rather than act.
