# Review Branch

1. With empty args, use `git diff HEAD`; with `base:<ref>`, use `git diff <ref>...HEAD`.
2. Capture branch name and read available Brief, Plan, and verifier evidence.
3. Default: dispatch `reviewer` with `Required skill: wf-review`, `Mode: standards-spec`.
4. Elevate for auth, data, concurrency, broad/high-risk changes, migrations, irreversible effects, weak evidence, or unclear verification: dispatch both reviewers with `wf-review` in `standards-spec` and `adversarial-risk` modes.
5. One worker writes the result directly; two or more require `judge` with `Required skill: wf-judge`.
6. Write `.agent-contexts/review.md` and `.agent-contexts/review-<timestamp>.md`.

Review reports evidence gaps but never runs build, lint, tests, or runtime verification.
