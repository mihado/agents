# Provider Workflow

Date: 2026-08-15

This repository is the source of truth for a user-global agent workflow: shared skills, provider bindings, and the `apm` install/check path that makes them reproducible across machines. It does not contain project-scoped agents.

This document is a human-readable architecture map. Workflow skills and their references remain authoritative for executable behavior and exact artifact schemas.

OpenCode is the reference harness because it exposes explicit agent roles, model pins, permissions, commands, and subagent dispatch. It is the complete implementation. Kiro currently supports reviewer bindings (`reviewer`, `reviewer-adversarial`) but they are not production ready. Claude and Codex receive shared instructions and skills but do not yet have equivalent workflow agents or commands.

## Workflow at a Glance

The workflow is a thin dispatcher over focused skills, not a fixed agent topology or universal skill bundle.

```text
user request
  → conductor chooses a lane and rigor
  → stable lane owner + applicable supporting practices
  → explicit artifact or evidence result
```

```text
uncertainty → Think → Brief → Plan → Act → Verify → Review
                                      ↑                │
                                      └── next slice ──┘
```

The conductor is the everyday front door; commands are optional ways to select a lane. Small clear work may stay lightweight, but follows the same authority and evidence boundaries.

[`wf-conductor`](../.agents/skills/workflow/wf-conductor/SKILL.md) is the authoritative executable contract for routing, escalation, artifact authority, recovery, and retries.

### Current design

The workflow separates deciding, authorizing, changing, proving, and judging work. The conductor is the only component that moves durable workflow state or changes execution authority. Workers provide bounded reports or changes inside that authority; no worker can promote its own output into the next stage. The lane loop above is the same workflow at a higher level; this is its execution view.

```text
Human intent
  → conductor settles or records the objective
  → planner proposes a draft
  → conductor validates and publishes an executable slice
  → operator changes the repository
  → verifier establishes evidence
  → reviewer evaluates conformance and risk
```

Three rules keep the design lightweight without making it loose:

- A Brief owns the full objective and its acceptance criteria; one executable Plan owns only the next bounded vertical slice.
- A draft is durable collaboration state, while an executable Plan is the sole authority for Act and Verify.
- Evidence is role-specific: an operator reports work, a verifier issues verdicts, and a reviewer raises findings. No positive result silently substitutes for another role's evidence.
- Dispatches are addressed: the conductor resolves the canonical workspace root from the `pwd -P`-canonicalized invocation directory as `workspace_root` — the workspace need not be a Git worktree — and workers resolve project artifacts only under it — never `$HOME`, `/`, or unrelated roots. Each dispatch also declares a contained `repository_root`; repository evidence resolves only under it. Every worker dispatch carries a minimal dispatch envelope — shared `dispatch_id`/`workspace_root`/`repository_root`/`observed_target`; artifact-consuming workers (the read-only workers plus the verifier) additionally receive an ordered `inputs` list declaring each root-relative path and expected identity instead of inlined bodies, and one retry may attach only the matching validated bodies for declared inputs. Path, input, transport, and report-envelope failures are `DISPATCH_FAILURE` with no domain, gate, readiness, lineage, acceptance, or revision-budget authority; operator and verifier dispatch failures are `BLOCKED`.
- Multi-repo workspaces delegate through an explicit tally: the manager is the sole writer of the tally and its published artifacts, concurrent delegations open unique `(repository_root, repository_work_id)` rows with distinct stable work IDs, the manager publishes normal Brief/Plan artifacts into the target repository's stable work directory, adoption completes through the repository's local `active.md` pointer — set only by the repository's conductor — and status requests update the tally at `.agent-contexts/delegations.md` from each nonterminal row's exact repository child work dir — never the repository's `active.md`. See [`references/workspace-delegation.md`](../.agents/skills/workflow/wf-conductor/references/workspace-delegation.md).

Planning and review rigor scale with uncertainty and risk. The normal path uses one planner and a closed readiness gate. Elevated planning runs an adjudication and revision loop, shared across adjudication and final-gate feedback, that continues while each persisted planner revision makes evidence-backed progress on the cited concerns and stops as `BLOCKED — planning loop` once the loop turns circular; dispatch failures never count as revisions or progress. Material route, safety, contract, or acceptance uncertainty elevates through research, adversarial planning, or human decision rather than being concealed inside implementation.

| Lane | Stable owner | Output |
| --- | --- | --- |
| Think | conductor | Brief (`brief-<n>.md`). |
| Plan | `wf-planning` | Durable draft for one bounded slice; the conductor publishes the executable Plan. |
| Act | conductor (orchestrates `wf-execution`, `wf-verification`, `wf-review`) | Operator result + verification + review evidence. |
| Verify | `wf-verification` | Verification artifact: `PASS`, `FAIL`, `INCOMPLETE`, or `BLOCKED`. |
| Review | `wf-review` | Standards/Spec findings with disposition. |

Ship (release automation with rollback and operational proof) is an architectural extension outside the current kernel. Supporting practices (`shipping-and-launch`, `observability-and-instrumentation`, `git-workflow-and-versioning`) remain available for explicit release work.

### Uncertainty methods

The conductor classifies the blocker before advancing work. Classification follows a fixed precedence: explicit user-owned decision, scope or acceptance criteria, safety/non-functional/privacy/security boundary, public-contract semantic change, publication/abandonment/workflow exception, then implementation mechanics (local APIs, package signatures and compatibility, naming and file layout, DTOs, fixture and evidence/test mechanics). Mechanics continue automatically through research or planner revision unless supported evidence changes a settled boundary. These methods are not workflow lanes; they resolve uncertainty for Think or Plan.

| Blocker | Method | Result |
| --- | --- | --- |
| Intent is unclear | `interview-me` | Confirmed intent feeds Think. |
| Behavior or form needs a concrete reaction | `prototype` | Disposable reaction surface and recorded decision feed Think. |
| A bounded factual question blocks Think or Plan | `wf-research` | Source-backed evidence returns to the invoking lane. |
| The destination exceeds one session of dependent decisions | Suggest `wayfinder` | Bounded destination feeds Think. |

Think invokes Research when evidence is required to settle a Brief. Plan invokes it when evidence is required to select an implementation route. A Plan-time result returns to Think when it changes the Brief's outcome, acceptance criteria, hard constraints, or settled decisions. Standalone factual requests use normal research behavior without creating workflow state.

Prototype code is decision evidence, not production evidence: it cannot satisfy Brief acceptance criteria or enter Act lineage.

### Rolling slices

The Brief governs the complete objective. Each Plan authorizes one bounded vertical slice with explicit Brief-criterion coverage and focused evidence. Accepted slices return to Plan until cumulative accepted evidence covers every Brief criterion; only then does the conductor run final Brief-wide verification and review.

## Artifact Lifecycle

A work is one coherent, human-selected objective. The conductor creates work immediately before the first durable artifact.

### State machine

```text
No work
  → Brief (Think settles intent)
    → Plan draft (durable review state)
    → Executable Plan (publication)
      → Execution attempts (pointer stays on Plan)
        → Completion candidate (user confirms closure)
          → Completed

Any active state → Abandoned (user decision)
```

### Pointer semantics

`active.md` selects the one active work. Its `current_artifact_path` tracks the governing Brief or executable Plan. `plans/` contains only drafts and published Plans; current candidate and adjudication working papers live in `planning/<slice-key>/run-<n>/` and revise in place. Every consuming dispatch pins its expected revision. `@<candidate-key>.draft.md` focuses one draft for the current conversation without changing the pointer. A reviewed draft may be `ready`, but readiness means eligible rather than selected; readiness is per revision, and any subsequent revision resets it to `draft`. The conductor resolves which draft to publish through intent-based resolution (explicit name in the current request, focused `@` draft, or the sole unambiguous ready draft) and re-reads the current revision before writing the Plan. During execution, the pointer stays on the governing Plan; `latest_attempt` tracks execution progress separately.

| Event | Pointer moves to | `latest_attempt` |
| --- | --- | --- |
| Think writes Brief | `brief-<n>.md` | `null` |
| Research evidence persisted | unchanged; invoking lane resumes | `null` |
| Plan draft persisted or revised | unchanged | unchanged |
| Plan published (ordinary or human-approved) | `plans/plan-<n>.md` | `null` |
| Attempt starts | unchanged (stays on Plan) | `execution/attempt-<n>` |
| Work closed | unchanged | unchanged |

### Work directory layout

```text
.agent-contexts/
  active.md                          ← mutable navigation state
  work/
    <work-id>/
      brief-<n>.md                   ← decision: intent and acceptance
      research/
        research-<n>/
          planner.md                 ← constructive evidence report
          planner-adversarial.md     ← adversarial evidence report
          synthesis.md               ← judge reconciliation
      dispatch/
        dispatch-<id>-attempt-<n>.md ← conductor diagnostic for a failed dispatch
      planning/
        <slice-key>/
          run-<n>/
            candidate-<n>.md         ← current complete candidate
            adjudication-<n>.md      ← current panel decision
      plans/
        agent-chat-foundation.draft.md ← reviewable candidate; revised in place
        plan-<n>.md                  ← executable route
      execution/
        attempt-<n>/
          operator.md               ← changed scope and retry safety
          verify.md                 ← independent evidence verdict
          review.md                 ← in-loop standards/risk review
      reviews/
        review-<n>.md               ← standalone user-invoked review
```

### Key rules

- The conductor alone persists durable workflow artifacts. Workers return reports.
- The user is the final decision authority. A direct instruction may revise, replace, abandon, or advance workflow state after the conductor states any material historical or safety consequence.
- Every artifact begins with `wf-artifact/v1` YAML frontmatter. Plan drafts use `artifact_role: plan-draft` and `readiness: draft`; published Plans use `artifact_role: plan` and either `readiness: implementation-ready` or bounded `readiness: human-approved` with an approval record.
- The conductor persists each Plan candidate before presenting or reviewing it. A draft is durable for review and recovery but cannot authorize Act or Verify.
- A planning request produces a draft by default. Once it passes its applicable planning gate, the conductor sets `readiness: ready` with a durable record of the gate and evidence. Readiness is per revision; revising a draft resets it to `draft` and clears that record.
- A descriptive `candidate_key` identifies each draft, for example `agent-chat-foundation`. Multiple drafts may coexist; revisions update the named draft in place with `revision`, `revised_at`, and `revision_summary` rather than creating a lineage chain.
- Multiple drafts may be `ready`. Readiness means eligible for ordinary publication, never selected; the conductor re-reads the resolved draft's current revision before publishing.
- Both publication paths resolve the draft through the same order: explicit current request, focused `@` draft, sole unambiguous ready draft, or clarification. After resolution, ordinary publication requires `readiness: ready`, `readiness_revision == revision`, and the full structural-validity floor. The conductor then renames the selected draft to `plan-<n>.md`, changes its envelope to an `implementation-ready` Plan, and updates `active.md`. Git preserves the draft history; the workflow does not retain a duplicate source draft.
- Human-approved publication is a deliberate co-development starting point, not a weaker ordinary gate. After explicit affirmation, it may bypass readiness, standard-gate completeness, adversarial review, and successor-lineage evidence. It records unresolved items, accepted concerns, and the boundary that returns `NEEDS_CONTEXT`; approval never authorizes silent changes to scope, acceptance, safety, contracts, or required evidence.
- Completed execution evidence is immutable. The human may classify an active Plan change as immaterial and revise it in place; a material change creates a successor Plan linked to its predecessor. The conductor may recommend the classification but does not decide against the human.
- Historical execution evidence remains immutable, but the decision owner may revise the active Brief or unexecuted next slice directly. The conductor clears `latest_attempt`, returns to Plan, and treats evidence for changed criteria as historical unless explicitly reaffirmed.
- At every consuming gate, a material mismatch (unrelated to Plan-authorized changes) marks the artifact `STALE`.
- Each Operator or standalone Verify invocation creates a fresh attempt. Attempts are immutable once evidence is written. `latest_attempt` is cleared whenever authority moves to a new Plan or back to the Brief, and when work is abandoned.
- Act completion is a candidate; the user confirms closure.

For full artifact schemas, lineage templates, and transition rules, see [`references/artifacts.md`](../.agents/skills/workflow/wf-conductor/references/artifacts.md).

## Workflow Kernel

The kernel defines lane authority, artifact state machine, evidence floors, and escalation. It is owned by this repository and the skills below.

### Workflow maintenance

Bounded edits to workflow-owned documentation, skills, provider wrappers, or contract tests that do not create or modify a user work package stay outside the kernel lifecycle. Read the authority and direct consumers once, make the smallest coherent change, run one focused proof and `git diff --check`, and add adversarial review only for routing, authority, safety, or artifact-semantics changes. They create no Brief, Plan, Act, Verify, or workflow artifacts.

### Package seams

When a planned value crosses a package boundary, the Plan names its producer, consumer, minimal public signature, and declaration-boundary proof. Private implementation types and runtime assembly remain behind that seam; “private” never removes the value a consumer needs.

| Skill | Lane | Mode / boundary |
| --- | --- | --- |
| [`wf-conductor`](../.agents/skills/workflow/wf-conductor/SKILL.md) | all | Lane routing, artifact authority, recovery, bounded retries. |
| [`wf-planning`](../.agents/skills/workflow/wf-planning/SKILL.md) | Plan | `candidate` returns one complete Plan from a conductor-selected composite profile set; `graft` applies judge-cited decisions to its selected base. Independent candidates are added only when comparison changes the Plan. |
| [`wf-research`](../.agents/skills/workflow/wf-research/SKILL.md) | evidence method | `research` gathers evidence; `adversarial` seeks contrary evidence. |
| [`wf-execution`](../.agents/skills/workflow/wf-execution/SKILL.md) | Act | Applies approved units; returns operator result. |
| [`wf-verification`](../.agents/skills/workflow/wf-verification/SKILL.md) | Verify | Sole owner of verdicts. Independent command safety classification. |
| [`wf-review`](../.agents/skills/workflow/wf-review/SKILL.md) | Review | `standards-spec` or `adversarial-risk`. Read-only, report-only. |
| [`wf-judge`](../.agents/skills/workflow/wf-judge/SKILL.md) | Synthesis | Reconciles worker reports. Never inspects source code. |

Recovery is a branch of `wf-conductor`, not a separate skill.

## Practice Skills

Practice skills supply methods within workflow authority. The workflow selects the method, supplies its inputs, consumes its output, and owns the next transition; the practice skill owns its method.

| Skill | Trigger |
| --- | --- |
| `interview-me` | Intent cannot be settled without assumptions. |
| `prototype` | A concrete reaction is needed before committing to production acceptance. |
| `wayfinder` | The destination exceeds one session of dependent decisions. |
| `source-driven-development` | A current library, SDK, service, or upstream fact matters. |
| `security-and-hardening` | Untrusted input, authentication, storage, tenant boundaries, or third-party integration apply. |
| `browser-testing-with-devtools` | The required evidence is browser behavior and the tooling exists. |

Other installed practice skills remain available for explicit requests. They are not part of the workflow architecture until the conductor has a stable trigger, authority boundary, consumed output, and transition for them.

### WIP: Practice-skill integration

The uncertainty methods are integrated. The following is the candidate integration sequence; trim it as real use shows a skill does not earn workflow-specific routing. Preserve each adopted method substantially as written.

| Order | Practices | Boundary to settle |
| --- | --- | --- |
| 1 | `source-driven-development`, `spec-driven-development` | Current external facts and materially incomplete requirements in Think, Plan, and bounded Act. |
| 2 | `api-and-interface-design`, `domain-modeling` | Public contracts, vocabulary, ownership, and module boundaries in Plan. |
| 3 | `security-and-hardening`, `deprecation-and-migration`, `ci-cd-and-automation` | Security, migration, and delivery-system constraints that may elevate planning or constrain Act. |
| 4 | `hallmark`, `impeccable`, `frontend-ui-engineering` | Greenfield direction, settled UI design, and implementation mechanics across Think, Plan, and Act. |
| 5 | `test-driven-development`, `incremental-implementation`, `debugging-and-error-recovery`, `performance-optimization` | Test-first behavior, slice sizing, failure investigation, and measured performance work in Act. |
| 6 | `browser-testing-with-devtools`, `code-review-and-quality` | Browser/runtime proof in Verify and additional quality review in Review. |
| 7 | `shipping-and-launch`, `observability-and-instrumentation`, `git-workflow-and-versioning` | Explicit release, production visibility, and version-control work outside the current kernel. |

For each practice, define the trigger, workflow inputs, consumed output, authority boundary, and completion transition. Exercise it on representative work before integrating the next boundary.

Deterministic patching of vendored skills is deferred. A future supply-chain design must preserve upstream provenance, apply repository-owned patches reproducibly, fail closed on conflicts, and review the effective skill before acceptance.

### WIP: Context distillation

Git records accepted project state: source changes, settled workflow contracts, durable documentation, ADRs, and evidence that authorizes, proves, or gates work. It is not the default store for session transcripts or every exploratory artifact. Capturing raw agent context in Git before its shape is settled creates churn, hides material changes, and gives provisional thinking more authority than it has earned.

Thinking traces still matter. They preserve provenance for material decisions, rejected approaches, failed experiments, discovered constraints, and the uncertainty that led to a later rule. They are useful input for improving skills, workflow contracts, and eventually model training, but are not yet reliable operational memory: current models cannot consistently retrieve, prioritize, and apply large unstructured traces without introducing noise or stale authority.

The current boundary is distillation:

```text
working conversation or scratch trace
  → distilled learning, decision, or constraint
  → documentation or ADR when settled and broadly reusable
  → workflow artifact only when it authorizes, proves, or gates work
  → Git when the resulting record is accepted project state
```

A future trace system may preserve raw thinking separately with explicit provenance, retention, retrieval, and learning rules. Do not introduce it until there is a demonstrated use case and a credible retrieval loop.

## OpenCode Reference Binding

OpenCode agent bindings own provider concerns: model, permissions, and provider-specific return boundary. Workflow skills own reusable behavior.

### Dispatch pattern

The conductor dispatches a named worker and supplies `Required skill: wf-*`. OpenCode resolves the worker name to its binding; the wrapper loads the named workflow skill and follows its contract.

```text
conductor dispatch: operator + Required skill: wf-execution
  → OpenCode resolves config/providers/opencode/agents/operator.md
  → operator wrapper loads wf-execution
  → wf-execution returns Operator Result
```

The conductor knows stable agent and workflow-skill names, not provider model or permission settings. A provider binding must not restate or replace the workflow contract.

| Role | Agent | Model | Permissions |
| --- | --- | --- | --- |
| Conductor | `conductor` | `c9/cx/gpt-5.6-terra` | edit + bash + task |
| Planner | `planner` | `c9/deepseek-v4-pro-fusion` | read-only + bash |
| Adversarial planner | `planner-adversarial` | `c9/cx/gpt-5.6-terra` | read-only + bash |
| Operator | `operator` | `c9/minimax-m3` | edit + bash |
| Verifier | `verifier` | `c9/mimo-v2.5` | read-only + bash |
| Reviewer | `reviewer` | `c9/deepseek-v4-pro-fusion` | read-only + bash |
| Adversarial reviewer | `reviewer-adversarial` | `c9/cx/gpt-5.6-terra` | read-only + bash |
| Judge | `judge` | `c9/cx/gpt-5.6-sol` | read-only + bash |

Model IDs are provider-qualified so subagents cannot silently inherit the parent model. Models may evolve; lane authority and evidence boundaries do not.

### Commands

| Command | Behavior |
| --- | --- |
| `/think` | Produce a Brief. |
| `/plan` | Produce the next execution Plan. |
| `/act` | Operator, Verify, Review, and bounded repair cycles. |
| `/verify` | Standalone independent verification. |
| `/review` | Standards/Spec review with conditional adversarial elevation. |

## Source and Installation

| Kind | Source of truth | Runtime target |
| --- | --- | --- |
| Shared instructions | repo root `AGENTS.md`, `CLAUDE.md` | linked into provider homes |
| Shared skills | `.agents/skills/` | flat per-skill links at `~/.agents/skills/<skill-name>/` |
| Provider config | `config/providers/<provider>.json` | provider-global config |
| Provider agents/commands | `config/providers/<provider>/{agents,commands}/` | provider-global home |

The repository groups source skills by domain, but each installed home exposes a flat skill namespace: source `.agents/skills/workflow/wf-conductor/` installs at `~/.agents/skills/wf-conductor/`.

`apm install` performs aggregate installation (symlinks, MCP, provider config). `apm check` performs aggregate integrity verification (doctor, MCP, providers, skills). `apm providers install` and `apm providers check` handle provider configuration only. `apm skills fetch → review → reject <unwanted> → accept` is the vendor supply chain; `apm skills check` verifies live lock integrity after promotion. Restart the harness after installation or workflow changes.

## Supporting Records

| Document | Purpose |
| --- | --- |
| [`docs/assessments/2026-07-08-poc-workflow-architecture-learnings.md`](assessments/2026-07-08-poc-workflow-architecture-learnings.md) | Evolution, upstream comparisons, and decisions |
| [`wf-conductor`](../.agents/skills/workflow/wf-conductor/SKILL.md) | Executable conductor contract |
| [`references/artifacts.md`](../.agents/skills/workflow/wf-conductor/references/artifacts.md) | Artifact state-transition authority |
| `config/providers/opencode/agents/conductor.md` | OpenCode conductor binding |

## References

- [Addy Osmani agent-skills](https://github.com/addyosmani/agent-skills)
- [Matt Pocock skills](https://github.com/mattpocock/skills)
- [Compound Engineering plugin](https://github.com/EveryInc/compound-engineering-plugin)
- [SmallHarness](https://github.com/GetSmallAI/SmallHarness)
- [OpenCode agents](https://opencode.ai/docs/agents/)
- [OpenCode commands](https://opencode.ai/docs/commands/)
- [OpenCode permissions](https://opencode.ai/docs/permissions/)
