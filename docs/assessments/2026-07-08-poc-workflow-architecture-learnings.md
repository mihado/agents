# POC Workflow Architecture: Learnings

Date: 2026-07-08

## What the POC exposed

The first conductor loop revealed that splitting workflow logic across too many surfaces (command templates, conductor prompt, fixed subagent prompts, per-agent permission frontmatter, model pinning) made iteration expensive. Small shape adjustments required coordinated edits across multiple files, and permission tuning became part of the normal debug loop.

## How the routing model converged

The early instinct was to adapt Compound Engineering directly: use a conductor to fan out specialist passes, then synthesize them. That was useful but too
heavy as a default. CE's value is its dispatcher mindset — select rigor from the work's risk and changed surface — not its large fixed reviewer roster.

Matt Pocock's skills clarified the upstream problem. Before planning, the workflow needs to distinguish discoverable facts from user decisions, keep
asking one useful question at a time, and turn settled work into narrow vertical slices. This made intent settlement a real conductor concern rather than a premature planner dispatch.

The later comparison with Oh My Pi and SmallHarness reinforced two boundaries: execution should be role-bounded and explicit about what it yields; evaluation
needs direct evidence rather than optimistic summaries. We adopted those principles without their runtime machinery, fallback infrastructure, autonomous loops, or scorecards.

The pleasant result of comparing the upstream catalogs was that Addy's skills already cover most of the lifecycle disciplines we needed. The problem was not
to invent another universal methodology. It was to put a small routing layer on top of the catalog: stable lane ownership, an explicit hard contract, and
evidence requirements that cannot be silently weakened. The earlier idea of a short Plan-only skill allowlist was too restrictive: it would turn the planner
into a shadow implementer and discard Addy's adaptive method selection during real work.

The resulting design is a synthesis:

- **Addy supplies the capability catalog** and applicability-bounded practices;
  workers may adapt method within their assigned contract.
- **Matt supplies the ideation and ambiguity discipline** before execution.
- **CE supplies conditional dispatch and adversarial escalation.**
- **OMP supplies role-aware execution and safety-boundary thinking.**
- **SmallHarness supplies evidence-first evaluation and dogfood discipline.**
- **Our conductor supplies deterministic selection, artifacts, and the authority boundary between those pieces.**

This is deliberately less ambitious than a typed multi-agent runtime. The POC
needs to prove that stable authority plus adaptive methods improves ordinary
work before adding more orchestration machinery.

## What settled

The stable product is not a fixed two-worker adversarial topology for every task. The stable product is:

- keep the stable artifact sequence: think → plan → act → verify → review
- keep hard authority boundaries where they matter: editor vs non-editor, verifier vs reviewer, judge as synthesis-only
- let the conductor choose how much rigor to apply based on risk, ambiguity, and changed surface

The next POC direction makes that selection explicit rather than leaving it as informal prompt judgment. A local lane registry assigns one stable owner to
each lane and defines evidence and return gates. The conductor owns the hard contract; workers may discover supporting skills in their authorized lane, but must escalate rather than silently changing that contract.

Concretely, a cheap default pass handles most tasks. Elevated passes (adversarial review, adversarial planning) are conditional rather than mandatory. The judge runs only when two or more workers produce outputs that must be reconciled.

## External patterns that shaped us

### From the Compound Engineering plugin

CE's code review skill runs up to 13 parallel reviewer personas selected from what the diff actually touches — not a fixed roster. The synthesis pipeline merges, deduplicates, and promotes findings on cross-persona agreement. Severity (P0-P3) is orthogonal to follow-up routing, and review output routes to structured residual work rather than disappearing into chat.

The plugin achieves this with zero custom agents — a single 800+ line SKILL.md prompt file. The orchestrator spawns generic subagents seeded with persona prompt files from a references directory. Every constraint is prose ("Do not edit any files"), not YAML permissions.

What we took:

- **Conditional escalation.** Don't always run the most expensive review. Match rigor to risk. CE selects reviewers based on what the diff actually touches — security when auth changes, data-migration when a schema changes, adversarial when code lines exceed a threshold. Our conductor now owns escalation decisions: default to cheap passes, add adversarial workers when the task warrants it.

- **Permission posture.** CE proved that prompt prose is the effective control surface for read-only analysis agents. Our assessment confirmed the same: granular bash allowlists created friction without meaningfully increasing safety during POC. All subagents now get `bash: allow` with only `edit: deny` as the hard boundary.

### From Addy's skill catalog

Addy's `using-agent-skills` is a phase-routing catalog. It expects a capable
agent to identify applicable skills as work evolves, and explicitly places
documentation-grounded implementation, incremental work, UI/API discipline,
testing, debugging, review, and shipping in different phases. This is more
adaptive than the first version of our lane registry.

We initially interpreted multi-agent safety as “the Plan names every skill the
operator may use.” That would make the Plan a fragile, overly detailed shadow
implementation: the planner would need to anticipate every documentation lookup,
debugging tactic, test approach, or local implementation method. It also blocks
the useful part of Addy's model: selecting a better supporting discipline when
the code reveals what is actually needed.

What we took:

- **Stable lane owners.** `wf-planning` owns implementation plans, `wf-research` supplies bounded evidence decisions, `wf-execution` owns approved execution, and `wf-verification` owns independent evidence verdicts.
- **Stable authority plus adaptive method.** The Brief owns outcome and non-functional commitments. The Plan owns the happy path, failure modes, evidence floor, suggested skills, and escalation conditions. The operator owns detailed method and may select relevant supporting skills inside that contract.
- **Evidence is not interchangeable.** Static checks do not prove a UI flow; a missing required browser/runtime, manual, operational, or external proof is  `INCOMPLETE`, not `PASS`.

What we explicitly did not take:

- **Unrestricted worker-selected contract changes.** Workers may select supporting skills, but cannot use that freedom to change scope, acceptance criteria, product or architecture decisions, security/data/operational boundaries, or mandatory evidence. They return the decision to the conductor with a rationale.
- Browser/runtime verification as a POC requirement before browser tooling is installed and validated. It remains a Plan-declared gate; lack of the tool is an explicit incomplete-evidence result.

The distinction is important: we rejected unbounded authority, not Addy's adaptive skill discovery. The acceptance rationale is that it keeps the plan small enough to be a useful route rather than a pseudo-implementation. The rejection rationale is that unrestricted discoveries could silently invalidate the business contract or lower the proof required to claim completion.

### From firstmate

firstmate's strongest useful signal for us is not worktrees or fleet backends. It is the orchestrator discipline: one user-facing coordinator, durable state as truth, recovery as reconciliation instead of restart, and outcome-facing reporting that hides crew mechanics unless they matter.

This is convergent validation more than a borrow: we arrived at the single-front-door conductor pattern independently, and firstmate's design corroborates it. We did not take much mechanically from them.

What we took:

- **Single front door.** The conductor is the main conversational surface. Workers should stay behind it.
- **Durable state beats memory.** Accepted artifacts are canonical. Model memory and exploratory traces are caches until their material conclusions are distilled into an accepted artifact, documentation, or ADR.
- **Recovery is reconciliation.** On return after context decay, reconstruct from state and live evidence before planning new work.
- **Escalate only actionable state changes.** Surface blocked, failed, needs-decision, completed, and ready-for-review states rather than every internal step.
- **Outcome-facing communication.** Report what matters to the user, not orchestration mechanics by default.

### From Matt Pocock's skills

Matt's wayfinder handles ambiguity upstream of any spec: create investigation tickets (research, prototype, grilling, task) to resolve fog one decision at a time, with blocking edges between them. The map is deliberately incomplete — "fog of war" for what can't be ticketed yet, graduated into new tickets as decisions resolve.

His to-tickets produces tracer-bullet vertical slices: each ticket cuts a narrow but complete path through every layer (schema, API, UI, tests), demoable or verifiable on its own. Never split into horizontal buckets. His code-review separates findings into Standards (repo conventions + Fowler smell baseline) and Spec (did the code match what was asked for?) — two axes kept separate so neither masks the other.

His grill-with-docs builds a shared domain glossary and ADRs inline during the think process, producing a `CONTEXT.md` that sharpens terminology across sessions.

What we took:

- **Tracer-bullet planning.** Each implementation unit is a vertical slice through every layer, demoable on its own. No backend-first, frontend-later, tests-last.

- **Two-axis review.** Standards (repo conventions + Fowler smells) and Spec (brief/plan conformance) reported separately. Adversarial review is elevation across both axes when warranted, not a standalone third axis.

- **Fact-vs-decision rule in think.** If a question is about a fact the codebase or docs can answer, inspect first. If it is about intent, priorities, constraints, or tradeoffs, ask the user.

- **Fowler smell baseline in review.** A fixed set of 12 code smells (*Refactoring*, ch.3) serves as a heuristic backstop when repo standards are silent. Review owns this, not act — the implementer shouldn't widen scope chasing smell avoidance during execution.

What we left for later:

- Issue tracker as wayfinder persistence surface. We use `.agent-contexts/` artifacts. Blocking-edge concept is portable without tracker integration.
- Shared domain glossary and ADR writing during think. Requires `CONTEXT.md` convention we haven't adopted yet.
- The full 13-reviewer CE persona roster. Our 2-worker (default + adversarial) setup is the right scale for a solo developer budget.

## What the rolling workflow clarified

The initial artifact sequence was too coarse. A Brief governs the complete objective, while a Plan should authorize only the next bounded vertical slice. This keeps execution, verification, and review focused on work that can be completed and evidenced now.

```text
Brief
  → slice Plan → Operator → Verify → Review
  → next slice Plan while Brief criteria remain
  → final Brief-wide Verify → Review
```

This resolves the mismatch between incremental delivery and Plan-wide verification. A slice can pass for the Brief criteria it advances without claiming the objective is complete. Only cumulative accepted evidence for every Brief criterion permits the final gate.

## What durable planning clarified

Planning output has two distinct states. A `plan-draft` is a durable candidate for reading, adversarial review, revision, and recovery. It remains subordinate to the governing Brief or executable Plan and cannot authorize Act or Verify. The conductor persists each candidate before presenting it, so an interrupted session does not lose the planning record. Drafts are not named in `active.md`; concurrent conductors can prepare future slices while the active Plan remains authoritative. A draft ID is one candidate slice, not one revision: multiple candidates coexist and each is revised in place with a compact revision record. A reviewed draft may be `ready`, which makes it eligible for ordinary publication but does not select it. The conductor resolves which draft to publish through intent-based resolution: explicit name in the current request, focused `@` draft, sole unambiguous ready draft, or a clarification prompt.

A published `plan` is the selected draft renamed to `plan-<n>.md` and converted into the execution authority. The conductor re-reads the current revision before renaming it and requires `ready` for ordinary publication. Git retains the candidate's revision history, so the workflow does not retain a duplicate source draft or publication bookkeeping. Human approval resolves through the same order, with the conductor surfacing the resolved draft, revision, and approval record for affirmation; it permits bounded discovery, not silent changes to scope, acceptance, safety, contracts, or evidence. `active.md` points only at the governing execution authority.

The important refinement is that readiness is durable evidence, not a conversational conclusion. Each draft revision clears its readiness record because a gate result applies to a specific proposal, not to a candidate name forever. Several ready drafts can coexist without a race for authority. Intent resolves publication: an explicit current request wins, then a focused draft, then one unambiguous ready candidate; ambiguity returns to the human instead of letting recency or scan order choose the next slice.

Human approval is intentionally not a second, weaker normal gate. It is a co-development mode for a current draft where proceeding is more useful than fully specifying implementation in advance. It requires explicit affirmation, unresolved items, accepted concerns, and an execution escalation boundary. It bypasses ordinary readiness and successor evidence, but does not grant permission to change scope, acceptance, safety, contracts, or proof silently. Discovery past that boundary returns `NEEDS_CONTEXT`.

This clarified the current authority model. The conductor alone persists artifacts and moves `active.md`; the planner produces candidates; the operator changes code under a Plan; the verifier alone issues PASS/FAIL-style evidence verdicts; the reviewer produces findings; and the judge reconciles supplied reports without inspecting the underlying repository. The roles are deliberately asymmetric because independent evidence is more valuable than a larger pool of agents repeating the same judgment.

The remaining operational limitation is concurrency. The model assumes one conductor writes a particular draft at a time. Revision re-reads prevent accidental stale overwrites in the normal flow, but there is no lock or compare-and-swap protocol for simultaneous writers. That is deferred until concurrent conductors are a demonstrated need rather than a theoretical one.

The same iteration separated uncertainty methods from workflow lanes. Think, Plan, Act, Verify, and Review remain stable lanes. The conductor selects a method from the blocker:

- **Interview** resolves unclear intent before Think can write a Brief.
- **Prototype** resolves behavior or form through a disposable reaction surface; its result is decision evidence, never production acceptance evidence.
- **Research** answers bounded factual uncertainty inside Think or Plan. The invoking lane resumes; a Plan-time result returns to Think only when it changes Brief authority.
- **Wayfinding** is suggested when dependent decisions exceed one session; a bounded destination returns to Think.

This avoids treating Research as a Plan mode or turning exploratory methods into lanes. The stable rule is: the workflow context owns the decision and continuation; the selected method resolves the specific uncertainty.

We also learned to keep the conductor's routing language conceptual and state-gated. Commands remain explicit selectors, but ordinary-language requests use the same model. Examples are regression tools, not default routing content: add one only after observing a persistent boundary misroute that a sharper conceptual signal does not fix.

Finally, capability catalog integration must stay incremental. The workflow owns a practice skill's trigger, inputs, consumed output, authority boundary, and transition; the practice skill retains its method. A large catalog is useful as a candidate backlog, not an instruction to make every skill always active.

## What we kept as local design

These are our own decisions, not borrowed:

- **Separate verify lane.** Mechanical checks (typecheck, lint, tests) stay as their own stage rather than being folded into act. Matt embeds verification inside implement; CE has no separate verify. We keep it as QA — distinct from implementation and review.

- **Operator self-check.** Before the operator declares its handoff complete, it rereads the active `brief-<n>.md` and executable `plans/plan-<n>.md` under `.agent-contexts/work/<work-id>/` and checks the final state against the unit contracts. This catches spec mismatches before burning a verifier cycle, but remains non-authoritative: only the verifier can return `PASS`.

- **Artifact boundary.** The Brief records the desired business outcome,  acceptance criteria, and non-functional requirements. The Plan records the intended happy path, failure modes, proof strategy, suggested skills, and escalation conditions. The operator chooses detailed implementation method. This is accepted because it keeps planning useful without forcing the planner to anticipate every implementation detail; we reject exhaustive Plan recipes because they duplicate implementation work without the feedback available in the codebase.

- **Agent pinning.** CE and Matt achieve rich workflows with zero custom agents — just prompt files. We need pinning because OpenCode subagents inherit the parent model unless explicitly declared. Model routing (cheap operator on minimax-m3, constructive planner/reviewer on DeepSeek V4 Pro, adversarial planner/reviewer on GPT-5.6 Terra, judge on gpt-5.6-sol) requires agent frontmatter. The lesson is not to drop agents but to keep wrappers lean and put reusable behavior in shared skills.

- **Persona over provider.** The meaningful unit is the agent persona and its mandate, not whether it ran in OpenCode, Kiro, Claude, or another harness. A durable record should preserve which persona thought what, what evidence it used, and what conclusion it reached. Provider/runtime is secondary metadata.

## Permission posture for POC

Permissions are intentionally light:

- `conductor`: edit + bash + task
- `operator`: edit + bash
- all other subagents: `edit: deny`, `bash: allow`

No granular allowlists. Prompt constraints ("Do not edit any files," "Return output to the conductor") are the primary control surface. Revisit tighter permissions only after the loop shape stabilizes. This stance is directly informed by CE's architecture — a richer review pipeline with zero permission rules — and confirmed by our own friction with allowlist debugging during early POC.

## What stays for later

- Tracked idea-stage wayfinding with blocking investigation tickets
- Shared domain glossary and ADR writing during think
- Non-OpenCode provider adapters (Claude, Codex)
- Durability and recovery (session checkpoints, resume protocol)
- Persona-scoped durable logs for collaborative thinking across multiple agent personas
- GitHub-based review dispatch via Actions + labels

## Emerging durability need

The current collaboration pattern is already exposing a missing primitive: durable per-persona thinking records.

Partially addressed: per-attempt `operator.md`, `verify.md`, and `review.md` preserve structured, role-specific execution evidence. The open problem is exploratory thinking in Think and Plan, and cross-work or cross-provider reasoning that does not authorize, prove, or gate work.

The need is not "OpenCode log" versus "Kiro log." The useful distinction is persona-level:

- planner log
- adversarial reviewer log
- DeepSeek-style exploratory log
- conductor synthesis log

That suggests a future record shape such as:

- `logs/<persona>.md` or `.agent-contexts/logs/<persona>.md`
- append major conclusions, evidence, reversals, and open questions
- later add a clerk-style compaction pass that trims stale or superseded entries while preserving durable signal

This would let multiple agent personas think in parallel across providers without losing the thread or overloading canonical workflow artifacts. It remains deferred: raw traces need explicit provenance, retention, retrieval, and distillation rules before they can become useful institutional memory rather than another noisy archive.

## Upstream Sources

The POC architecture borrows selectively from external efforts. See the "What we took" sections above for the specific mechanisms.

- Compound Engineering plugin (conditional escalation, persona selection by diff surface, prompt-prose permission posture): https://github.com/EveryInc/compound-engineering-plugin
- firstmate (convergent validation of the single-front-door conductor pattern; not a heavy borrow): https://github.com/kunchenguid/firstmate
- Matt Pocock's skills (wayfinder ambiguity resolution, tracer-bullet tickets, two-axis Standards/Spec review, fact-vs-decision rule): https://github.com/mattpocock
- Superpowers (portable skills library + fixed methodology; brainstorming → plans → subagent-driven-dev with two-stage review; related-work reference, not a borrow): https://github.com/obra/superpowers
- SmallHarness (dynamic per-task model tiering, rubric-scored critic loop, overnight auto-run with context-reset; routing/evaluation reference, not a borrow): https://github.com/GetSmallAI/SmallHarness
- Oh My Pi (richer execution surface — role-based routing, real-time advisor model, typed subagent yields, hash-anchored edits, fallback chains; post-POC eval reference; borrowing its tool-design lessons now): https://github.com/can1357/oh-my-pi

## Where we sit

The workflow is a third path between two extremes:

- **Compound Engineering** — max parallelism, min structure: one 800-line skill, zero agents, 13-way persona fan-out.
- **Superpowers** — max structure, min dynamism: a fixed, auto-triggered pipeline over a curated, harness-portable skill library, always two-stage review.
- **Us** — the middle: explicit roles with provider-pinned model routing (more structure than CE), but conductor-chosen rigor instead of a fixed stage (more dynamism than Superpowers). Not 13-way, not always-two-stage — a cheap default pass, escalating to adversarial + judge only when the task warrants it. The conductor is the everyday surface and does most of the orchestration directly; specialized subagents are dispatched only when the task benefits from the extra rigor.

## Integrations & Infrastructure

Distinct from the methodology inspirations in Upstream Sources (which shaped the workflow design, not the tooling).

### Adopting now: open-code-review (Alibaba `ocr` CLI) — review engine

- **Why:** deterministic file selection/bundling (no corner-cutting on large diffs), built-in fine-tuned ruleset (NPE, thread-safety, XSS, SQL injection), ~1/9 the tokens of a general-purpose agent at higher precision, structured JSON (`category` + `severity`), resumable sessions, custom `rule.json`. Configured to use `c9` as the API provider (custom OpenAI/Anthropic gateway).
- **How it slots in:** powers the `reviewer` / `reviewer-adversarial` workers inside OpenCode via a bash call (`ocr review --format json --audience agent --background-file .agent-contexts/plan.md`). Feeds the Brief/Plan context for Spec conformance; maps `critical/high/medium/low` → `P0–P3`. Conductor parses JSON findings and routes them to the operator via the act retry loop. Addresses the LLM-subagent failure modes (coverage/position drift, unstable quality) our skills alone don't fully solve.
- **The remaining gap:** reviewer *prompt strength and feedback-loop maturity* — the engine gives structured input; the conductor→operator filtering + failure-mode-aware prompt design on top of ocr is the next iteration surface. Adopt the engine now, strengthen the loop on top.

### Deferred: Omnigent (meta-harness) — cross-vendor review substrate

- **Why it's interesting:** stateful policies enforced at the meta-harness layer (cost budget, `approve_shell`), cross-vendor review (Polly routes diffs to a reviewer from a *different vendor* than the writer), and its host model for registering machines as execution targets.
- **Why deferred:** Kiro is dropped for now (not supported by ocr, native-wrapping uncertain, ACP later); without a second harness to route to, Omnigent's cross-vendor value is unused. The mesh Omnigent + ocr is technically clean (ocr runs as a tool inside an Omnigent-wrapped OpenCode session), but adopting both now adds alpha risk (v0.4.0) and a second config surface for benefits you can't yet use. Revisit when multi-harness need returns.

### Infrastructure: Multica — cross-machine agent command centre

- **What it is:** an open-source (self-hostable) platform that turns coding agents into managed teammates — a unified runtime dashboard across machines, task lifecycle management (enqueue → claim → execute → complete/fail), an evolving skill library, and auto-detection of 14 supported coding tools including OpenCode and Kiro CLI.
- **Why it fits the personal setup** (main laptop + client VMs with data-sovereignty requirements): *"Code never passes through Multica servers"* — the server coordinates task state, agent execution stays local on each machine. Self-host on the main laptop, connect daemons on each client VM, get one agent/runtime overview across all machines. Pairs with VS Code Remote SSH per-VM for the IDE pane. Solves the "high overview of where things are / one command centre" requirement without violating client-VM data isolation.
- **How it relates to the workflow:** not a workflow integration — a separate control plane for *managing* agent sessions across machines. The OpenCode conductor + skills workflow runs inside the sessions Multica tracks. The cross-machine file tree concern is de-emphasised (at that operating level, strong loops and reports are what you deal with).

## Revision Notes

- 2026-07-08: Written after POC iteration, condensing fragmentation signals and learnings from the Compound Engineering plugin and Matt Pocock's skills into a single reference.
- 2026-07-09: Added upstream source URLs; framed firstmate as convergent validation; added Superpowers as related-work reference and the third-path positioning statement.
- 2026-07-09: Added Integrations & Infrastructure assessment — open-code-review (`ocr`) as adopting-now review engine on `c9`; Omnigent deferred until multi-harness need returns; Multica noted as cross-machine agent command centre (self-hostable, respects data sovereignty).
- 2026-07-13: Added the lane-routing direction: stable workflow owners, Plan-declared conditional disciplines, explicit evidence gates, and `INCOMPLETE` for unavailable required browser/runtime proof. Renamed the bounded execution role from typist to operator.
- 2026-07-13: Corrected the first lane-routing interpretation of Addy's catalog. The hard contract remains conductor/Brief/Plan-owned, but supporting skill discovery is worker-adaptive inside that contract. Added the Brief/Plan/operator boundary and explicit acceptance/rejection rationales.
- 2026-08-15: Folded rolling slices, uncertainty methods, conceptual state-gated routing, and incremental practice-skill integration into this learning record. The former workflow scratchpad was absorbed and removed.
- 2026-08-18: Recorded the current human-facing workflow design: durable draft candidates, revision-scoped readiness evidence, intent-based publication, narrow human-approved co-development, and role-separated execution evidence.
