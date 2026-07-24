# Plan and Research Branch

Read `.agent-contexts/brief.md`; if absent, return the user to Think. Choose one explicit route:

- **execution:** dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`.
- **elevated execution:** dispatch `planner` and `planner-adversarial` in parallel with `wf-planning` in `execution` and `adversarial` modes.
- **research:** only for a bounded decision question. Dispatch the configured `planner` with `Required skill: wf-research`, `Mode: research`, and the configured `planner-adversarial` with `Required skill: wf-research`, `Mode: adversarial`; require independent source inspection.

Do not substitute a generic worker for a named lane worker. Named workers enforce the provider's selected model, permissions, and wrapper boundary. If a required named worker or `judge` is unavailable, stop the lane as `BLOCKED` and name the unavailable binding.

Elevate execution planning for broad/cross-system touchpoints, auth/security, data-model changes, concurrency/orchestration risk, or unclear verification.

One substantive worker lets the conductor write the result directly. Two or more workers require `judge` with `Required skill: wf-judge`. Write execution output to `.agent-contexts/plan.md`. For research, write the constructive and adversarial reports to `.agent-contexts/research/planner.md` and `planner-adversarial.md`, dispatch `judge` with both reports marked `[RESEARCH SYNTHESIS]`, then write the synthesis to `synthesis.md`; never overwrite `plan.md`.

Research is complete only when both named-worker reports and the judge synthesis are persisted. Reports returned only in session are incomplete research, not a decision record.

Execution completion:

```md
## Plan Complete
- Plan written to `.agent-contexts/plan.md`
- Next: run `/act` or inspect the plan
```

Research completion:

```md
## Research Complete
- Constructive report: `.agent-contexts/research/planner.md`
- Adversarial report: `.agent-contexts/research/planner-adversarial.md`
- Synthesis: `.agent-contexts/research/synthesis.md`
- Next: <one bounded decision or execution Brief>
```
