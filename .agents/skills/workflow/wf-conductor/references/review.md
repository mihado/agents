# Review

1. With empty args, use `git diff HEAD`; with `base:<ref>`, use `git diff <ref>...HEAD`.
2. Resolve `active.md`, capture branch name, and read the active work's Brief, current Plan, and relevant verifier evidence. `/review` is a standalone report-only invocation; it enters the Act repair loop only when the conductor is already running that loop.
3. Default: dispatch the configured `reviewer` with `Required skill: wf-review`, `Mode: standards-spec`.
4. Elevate for auth, data, concurrency, broad/high-risk changes, migrations, irreversible effects, weak evidence, or unclear verification: dispatch `reviewer` and `reviewer-adversarial` with `wf-review` in `standards-spec` and `adversarial-risk` modes.
5. One worker writes the result directly; two or more require `judge` with `Required skill: wf-judge` and both reports marked `[REVIEW SYNTHESIS]`. The synthesized report includes exactly one disposition.

## Artifact location

- **In-loop review** (during Act): write to `execution/attempt-<n>/review.md` with metadata binding it to the reviewed scope, Brief, Plan, attempt, verifier evidence, and observed target.
- **Standalone review** (user-invoked `/review` outside Act): write to `reviews/review-<n>.md` with metadata binding it to the reviewed scope, Brief, Plan (if any), observed target, and diff reference. Standalone reviews are user-initiated quality checks — they share the disposition vocabulary but do not enter the repair loop.

A review is `STALE` as proof for a materially different Plan, attempt, or diff; preserve the original report.
