# Review Branch

1. With empty args, use `git diff HEAD`; with `base:<ref>`, use `git diff <ref>...HEAD`.
2. Resolve `active.md`, capture branch name, and read the active work's Brief, current Plan, and relevant verifier evidence. `/review` is a standalone report-only invocation; it does not enter the Act repair loop unless the conductor is already running that loop.
3. Default: dispatch the configured `reviewer` with `Required skill: wf-review`, `Mode: standards-spec`.
4. Elevate for auth, data, concurrency, broad/high-risk changes, migrations, irreversible effects, weak evidence, or unclear verification: dispatch the configured `reviewer` and `reviewer-adversarial` with `wf-review` in `standards-spec` and `adversarial-risk` modes.
5. One worker writes the result directly; two or more require the configured `judge` with `Required skill: wf-judge` and both reports marked `[REVIEW SYNTHESIS]`. The synthesized report includes exactly one disposition.
6. Write `.agent-contexts/work/<work-id>/execution/attempt-<n>/review.md` with metadata binding it to the reviewed scope, Brief, Plan, attempt, verifier evidence, and observed target. Classify its conductor-facing disposition as `no-actionable-findings`, `repair-in-scope`, `replan-required`, or `human-decision-required`. A review is `STALE` as proof for a materially different Plan, attempt, or diff; preserve the original report.

Review reports evidence gaps but never runs build, lint, tests, or runtime verification.
