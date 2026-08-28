# Review

1. With empty args, use `git diff HEAD`; with `base:<ref>`, use `git diff <ref>...HEAD`.
2. Resolve `active.md` and capture branch name. In-loop review reads the active work's Brief, current Plan, and relevant verifier evidence. Standalone `/review` resolves the Brief unconditionally; it resolves and declares a Plan or verifier evidence only when the invocation supplies it. It is a report-only invocation and enters the Act repair loop only when the conductor is already running that loop.
3. Default: dispatch the configured `reviewer` with `Required skill: wf-review`, `Mode: standards-spec`, and the dispatch envelope whose closed ordered declared inputs are the present artifacts from the declared reviewer inputs (below). The reviewer uses the declared artifacts at their declared paths.
4. Elevate for auth, data, concurrency, broad/high-risk changes, migrations, irreversible effects, weak evidence, or unclear verification: dispatch `reviewer` and `reviewer-adversarial` with `wf-review` in `standards-spec` and `adversarial-risk` modes, each receiving the same closed ordered declared input list from the declared reviewer inputs (below). Persist as each returns, before dispatching the judge, branching by review context:
   - In-loop (during Act): persist the standards report to `execution/attempt-<n>/review-standards.md` and the adversarial report to `execution/attempt-<n>/review-adversarial.md` (both `artifact_role: review`).
   - Standalone (`/review` outside Act): persist the standards report to `reviews/review-<n>-standards.md` and the adversarial report to `reviews/review-<n>-adversarial.md` (both `artifact_role: standalone-review`); `<n>` matches the episode's synthesized `reviews/review-<n>.md`.
5. With one reviewer, persist its returned report at the canonical path for the review mode. With two or more, require `judge` with `Required skill: wf-judge` and the dispatch envelope whose closed declared inputs are the two persisted review reports, marked `[REVIEW SYNTHESIS]`. The judge stays supplied-reports-only. Persist the synthesized report to `execution/attempt-<n>/review.md` (`artifact_role: review`) in-loop or `reviews/review-<n>.md` (`artifact_role: standalone-review`) standalone; it includes exactly one disposition.

**Declared reviewer inputs** — both reviewers receive the same closed ordered input list of present artifacts, in the order below; never declare an absent artifact or an undeclared extra. Validate every declared input under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity) before dispatch:

- In-loop (during Act): the Brief, the current Plan, and the attempt's verifier evidence.
- Standalone (`/review` outside Act): the Brief, plus the Plan and verifier evidence only when the invocation supplies them.

Review dispatch failures follow the dispatch-failure contract in [SKILL.md](../SKILL.md): reviewers are read-only, so retry once with the same validated artifact bodies before any usable valid report.

## Artifact location

- **In-loop review** (during Act): write to `execution/attempt-<n>/review.md` with metadata binding it to the reviewed scope, Brief, Plan, attempt, verifier evidence, and observed target; elevated reports persist alongside at the step-4 paths.
- **Standalone review** (user-invoked `/review` outside Act): write to `reviews/review-<n>.md` with metadata binding it to the reviewed scope, Brief, Plan (if any), observed target, and diff reference; elevated reports persist alongside at the step-4 paths. Standalone reviews are user-initiated quality checks — they share the disposition vocabulary but do not enter the repair loop.

A review is `STALE` as proof for a materially different Plan, attempt, or diff; preserve the original report.
