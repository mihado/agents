# POC Workflow Architecture: Learnings

Date: 2026-07-08

## What the POC exposed

The first conductor loop revealed that splitting workflow logic across too many surfaces (command templates, conductor prompt, fixed subagent prompts, per-agent permission frontmatter, model pinning) made iteration expensive. Small shape adjustments required coordinated edits across multiple files, and permission tuning became part of the normal debug loop.

## What settled

The stable product is not a fixed two-worker adversarial topology for every task. The stable product is:

- keep the same artifact sequence: idea → think → plan → act → verify → review
- keep hard authority boundaries where they matter: editor vs non-editor, verifier vs reviewer, judge as synthesis-only
- let the conductor choose how much rigor to apply based on risk, ambiguity, and changed surface

Concretely, a cheap default pass handles most tasks. Elevated passes (adversarial review, adversarial planning) are conditional rather than mandatory. The judge runs only when two or more workers produce outputs that must be reconciled.

## External patterns that shaped us

### From the Compound Engineering plugin

CE's code review skill runs up to 13 parallel reviewer personas selected from what the diff actually touches — not a fixed roster. The synthesis pipeline merges, deduplicates, and promotes findings on cross-persona agreement. Severity (P0-P3) is orthogonal to follow-up routing, and review output routes to structured residual work rather than disappearing into chat.

The plugin achieves this with zero custom agents — a single 800+ line SKILL.md prompt file. The orchestrator spawns generic subagents seeded with persona prompt files from a references directory. Every constraint is prose ("Do not edit any files"), not YAML permissions.

What we took:

- **Conditional escalation.** Don't always run the most expensive review. Match rigor to risk. CE selects reviewers based on what the diff actually touches — security when auth changes, data-migration when a schema changes, adversarial when code lines exceed a threshold. Our conductor now owns escalation decisions: default to cheap passes, add adversarial workers when the task warrants it.

- **Permission posture.** CE proved that prompt prose is the effective control surface for read-only analysis agents. Our assessment confirmed the same: granular bash allowlists created friction without meaningfully increasing safety during POC. All subagents now get `bash: allow` with only `edit: deny` as the hard boundary.

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
- Prototype and research dispatch as think-stage investigation tools.
- The full 13-reviewer CE persona roster. Our 2-worker (default + adversarial) setup is the right scale for a solo developer budget.

## What we kept as local design

These are our own decisions, not borrowed:

- **Separate verify lane.** Mechanical checks (typecheck, lint, tests) stay as their own stage rather than being folded into act. Matt embeds verification inside implement; CE has no separate verify. We keep it as QA — distinct from implementation and review.

- **Typist self-check.** Before the implementer declares done, it reads brief.md + plan.md and checks its own diff against acceptance criteria. Catches spec mismatches before burning a verifier cycle. Neither CE nor Matt prescribe this explicitly — inferred from their general discipline of checking work against the spec.

- **Agent pinning.** CE and Matt achieve rich workflows with zero custom agents — just prompt files. We need pinning because OpenCode subagents inherit the parent model unless explicitly declared. Model routing (cheap typist on minimax-m3, strong reviewer-adversarial on Kiro Sonnet, judge on GPT-5.5) requires agent frontmatter. The lesson is not to drop agents but to keep prompts lean and move reusable behavior toward skills over time.

## Permission posture for POC

Permissions are intentionally light:

- `conductor`: edit + bash + task
- `typist`: edit + bash
- all other subagents: `edit: deny`, `bash: allow`

No granular allowlists. Prompt constraints ("Do not edit any files," "Return output to the conductor") are the primary control surface. Revisit tighter permissions only after the loop shape stabilizes. This stance is directly informed by CE's architecture — a richer review pipeline with zero permission rules — and confirmed by our own friction with allowlist debugging during early POC.

## What stays for later

- Tracked idea-stage wayfinding with blocking investigation tickets
- Shared domain glossary and ADR writing during think
- Prototype and research dispatch as think-stage investigation tools
- Non-OpenCode provider adapters (Claude, Codex)
- Durability and recovery (session checkpoints, resume protocol)
- GitHub-based review dispatch via Actions + labels

## Revision Notes

- 2026-07-08: Written after POC iteration, condensing fragmentation signals and learnings from the Compound Engineering plugin and Matt Pocock's skills into a single reference.
