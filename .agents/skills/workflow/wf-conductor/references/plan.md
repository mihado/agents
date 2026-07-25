# Plan and Research Branch

Resolve `.agent-contexts/active.md`, then read the selected work's `brief.md`. If no active work exists but the request is settled, create one before writing the first artifact. If no Brief exists, write a minimal Brief from the settled request or return the user to Think. Choose one explicit route:

- **execution:** dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`.
- **elevated execution:** dispatch `planner` and `planner-adversarial` in parallel with `wf-planning` in `execution` and `adversarial` modes.
- **research:** only for a bounded decision question. Dispatch the configured `planner` with `Required skill: wf-research`, `Mode: research`, and the configured `planner-adversarial` with `Required skill: wf-research`, `Mode: adversarial`; require independent source inspection.

Do not substitute a generic worker for a named lane worker. Named workers enforce the provider's selected model, permissions, and wrapper boundary. If a required named worker or `judge` is unavailable, stop the lane as `BLOCKED` and name the unavailable binding.

Elevate execution planning for broad/cross-system touchpoints, auth/security, data-model changes, concurrency/orchestration risk, or unclear verification.

One substantive worker lets the conductor write the result directly. Two or more workers require `judge` with `Required skill: wf-judge`. Write execution output to `.agent-contexts/work/<work-id>/plans/plan-<n>.md`. For research, write the constructive and adversarial reports to `.agent-contexts/work/<work-id>/research/research-<n>/planner.md` and `planner-adversarial.md`, dispatch `judge` with both reports marked `[RESEARCH SYNTHESIS]`, then write the synthesis to `synthesis.md`.

All artifacts include `wf-artifact/v1` metadata. A Plan includes the active Brief identity, upstream research identities, observed target, and `readiness`. Append small revisions as dated Plan amendments. When a replacement is necessary, write the next Plan number with `supersedes` and `supersession_reason`; never overwrite the prior Plan. Update `active.md` to the current research synthesis or Plan only after the artifact is complete.

Research is complete only when both named-worker reports and the judge synthesis are persisted. Reports returned only in session are incomplete research, not a decision record.

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
- Next: <one bounded decision or execution Brief>
```
