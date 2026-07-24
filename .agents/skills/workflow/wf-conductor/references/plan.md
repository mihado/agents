# Plan and Research Branch

Read `.agent-contexts/brief.md`; if absent, return the user to Think. Choose one explicit route:

- **execution:** dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`.
- **elevated execution:** dispatch `planner` and `planner-adversarial` in parallel with `wf-planning` in `execution` and `adversarial` modes.
- **research:** only for a bounded decision question. Dispatch both planning workers with `Required skill: wf-research` in `research` and `adversarial` modes; require independent source inspection.

Elevate execution planning for broad/cross-system touchpoints, auth/security, data-model changes, concurrency/orchestration risk, or unclear verification.

One substantive worker lets the conductor write the result directly. Two or more workers require `judge` with `Required skill: wf-judge`. Write execution output to `.agent-contexts/plan.md`. For research, write worker reports to `.agent-contexts/research/planner.md` and `planner-adversarial.md`, then judge synthesis marked `[RESEARCH SYNTHESIS]` to `synthesis.md`; never overwrite `plan.md`.

Execution completion:

```md
## Plan Complete
- Plan written to `.agent-contexts/plan.md`
- Next: run `/act` or inspect the plan
```
