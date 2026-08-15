# Plan and Research Branch

Resolve `.agent-contexts/active.md`, then read the selected work's current Brief (`brief-<n>.md`). If no active work exists but the request is settled, create one before writing the first artifact. If no Brief exists, write a minimal Brief from the settled request or return the user to Think. Choose one explicit route:

Apply this precedence order before dispatch:

1. Return to Think when the Brief lacks a settled outcome, acceptance criteria, hard constraints, decision owner, or required safety/non-functional commitments.
2. Select research when the user explicitly asks for research, or when a bounded evidence question materially changes the approved route, architecture, scope, deployment topology, external integration, data model, security boundary, or acceptance evidence.
3. Select execution only when the Brief is settled and remaining unknowns are confined to implementation mechanics, such as local API shape, naming, file layout, or test-harness specifics. They must not change the approved route, deployment topology, external integration, or acceptance evidence.
4. Select elevated execution only after execution is eligible and broad/cross-system touchpoints, auth/security, data-model changes, concurrency/orchestration risk, or unclear verification require independent adversarial planning.
5. Do not use compatibility tracers, spikes, or later gates inside an execution Plan to defer a route-determining decision. Return that decision to research.

After selecting a route under this precedence order, use its matching dispatch below.

- **execution:** dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`.
- **elevated execution:** dispatch `planner` and `planner-adversarial` in parallel with `wf-planning` in `execution` and `adversarial` modes.
- **research:** only for a bounded decision question. Dispatch the configured `planner` with `Required skill: wf-research`, `Mode: research`, and the configured `planner-adversarial` with `Required skill: wf-research`, `Mode: adversarial`; require independent source inspection.

Do not substitute a generic worker for a named lane worker. Named workers enforce the provider's selected model, permissions, and wrapper boundary. If a required named worker or `judge` is unavailable, stop the lane as `BLOCKED` and name the unavailable binding.

One substantive worker lets the conductor write the result directly. Two or more workers require `judge` with `Required skill: wf-judge`. Write execution output to `.agent-contexts/work/<work-id>/plans/plan-<n>.md`. For research, write the constructive and adversarial reports to `.agent-contexts/work/<work-id>/research/research-<n>/planner.md` and `planner-adversarial.md`, dispatch `judge` with both reports marked `[RESEARCH SYNTHESIS]`, then write the synthesis to `synthesis.md`.

All artifacts include `wf-artifact/v1` metadata. A persisted execution Plan must include the active Brief identity, upstream research identities, observed target, `artifact_role: plan`, and exactly `readiness: implementation-ready`. A non-ready route is a Think outcome or research synthesis, never a Plan. Append small revisions as dated Plan amendments. When a replacement is necessary, write the next Plan number with `supersedes` and `supersession_reason`; never overwrite the prior Plan. Update `active.md` frontmatter `current_artifact_path` and `current_artifact_id` to a Plan only after the complete Plan passes this readiness gate. The path must be canonical and relative to `.agent-contexts/` (e.g. `work/<work-id>/plans/plan-01.md` or `work/<work-id>/research/research-02/synthesis.md`). Update the body Markdown link to match. Never use an artifact ID alone as the pointer.

Research is complete only when both named-worker reports and the judge synthesis are persisted. Reports returned only in session are incomplete research, not a decision record.

After persisting research, keep the synthesis as the active artifact and present its recommendation, unresolved human decisions, and the decision it unlocks. Present alternatives or material tradeoffs only when the synthesis reports them. Request an explicit user disposition: `adopt`, `reject`, or `adopt with changes`. Do not dispatch `wf-planning`, write an execution Plan, or revise the Brief in the same response. After a later explicit disposition, return to Think and write a superseding `brief-<n>.md` that records the adopted decision and research artifact IDs before entering execution planning.

Execution completion:

```md
## Plan Complete
- Plan written to `.agent-contexts/work/<work-id>/plans/plan-<n>.md`
- Next: run `/act` or inspect the plan
```

Research completion:

```md
## Research Complete
- Constructive report: `.agent-contexts/work/<work-id>/research/research-<n>/planner.md`
- Adversarial report: `.agent-contexts/work/<work-id>/research/research-<n>/planner-adversarial.md`
- Synthesis: `.agent-contexts/work/<work-id>/research/research-<n>/synthesis.md`
- Decision required: `adopt`, `reject`, or `adopt with changes`
- Next: <one bounded decision or execution Brief>
```
