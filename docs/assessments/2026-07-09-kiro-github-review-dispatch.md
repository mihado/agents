# Kiro GitHub Review Dispatch Assessment

Date: 2026-07-09

Scope: assess a GitHub-first review workflow that uses Kiro CLI as the review engine, runs selectively rather than on every PR, and writes results back to the PR through labels or bot-style dispatcher comments.

## Context

The working stance is:

- use Kiro CLI as the analysis engine
- use GitHub as the first host surface
- accept UX that is somewhat worse than native Copilot PR review if the workflow is portable and controllable
- avoid always-on review because not every PR needs agent scrutiny

This fits the existing workflow architecture. The repo already positions Kiro as the stronger adversarial planner/reviewer rather than the default pass.

## Assessment

The right shape is not to chase Copilot parity. The right shape is a thin review dispatch layer around Kiro CLI:

- Kiro CLI performs the analysis
- GitHub Actions decides whether to run it
- GitHub comment or review APIs publish the result back to the PR
- triggers stay explicit and selective

This gets most of the practical value of Copilot PR review without binding the pattern to GitHub-specific intelligence. GitHub becomes the first adapter, not the core architecture.

## Recommendation

Adopt a selective dispatch model with two primary triggers:

1. Label trigger: `ai-review`
2. Comment trigger: `/kiro review`

Optional extensions:

- `/kiro review deep` for an elevated adversarial pass
- automatic trigger only for risky paths such as auth, DB, orchestration, provider, or workflow files

This gives three entry paths:

- manual opt-in by label
- manual opt-in by PR comment
- automatic escalation for risky diffs

That is enough to make the system useful without turning every PR into an agent-review event.

## Why This Shape

Native Copilot PR UX is still better. GitHub owns that surface end to end.

But exact parity is not necessary. The workflow needs:

- selective invocation
- visible findings in the PR
- easy reruns
- a backend that can be ported to another host later

Label and comment dispatch satisfy those needs with minimal host lock-in.

## Publishing Model

Start with one sticky PR comment, not inline review comments.

Why:

- lower implementation complexity
- no diff-line mapping fragility
- easier prompt/output contract
- easy to rerun and replace on later pushes

Inline comments can come later if the review output becomes stable enough to justify a stricter machine-readable contract.

## Recommended Trigger Policy

Run Kiro review when any of the following is true:

- PR has label `ai-review`
- a PR comment matches `/kiro review` or `/kiro review deep`
- changed files match a risky-path ruleset

Examples of risky paths:

- `src/auth/**`
- `src/db/**`
- `src/providers/**`
- `.github/workflows/**`
- agent orchestration or permission/config surfaces

This keeps routine PRs narrow while still escalating changes that are more likely to benefit from adversarial review.

## Output Contract

The first version should use a strict markdown summary with findings only.

Suggested shape:

```md
## Kiro Review

### High
- `path:line` Finding and concise explanation.

### Medium
- `path:line` Finding and concise explanation.

### Low
- `path:line` Finding and concise explanation.

### Verdict
- advisory
- rerun with `/kiro review deep` for a stronger pass
```

Rules:

- findings first
- no praise or filler
- exact file references when possible
- say `NO_FINDINGS` if none

If inline comments are later desired, move to a JSON contract only after the markdown review has proven low-noise.

## Implementation Order

Build in this order:

1. Label-triggered Kiro review job
2. Comment-triggered dispatcher job via `issue_comment`
3. Sticky PR comment update instead of posting a new comment each run
4. Risky-path auto-trigger
5. Optional `deep` mode
6. Optional inline PR comments for high-confidence findings only

This sequence captures most of the value early while keeping the moving parts small.

## Architecture Boundary

Keep three concerns separate:

- review engine: Kiro CLI prompt and output contract
- dispatcher: GitHub trigger logic for labels, comments, and path rules
- publisher: sticky PR comment now, richer review surfaces later

That separation is the portability seam. GitHub can be replaced later without rewriting the review logic itself.

## Conclusion

GitHub-first, Kiro-backed, selectively dispatched review is the right near-term pattern.

Do not run Kiro on every PR. Do not try to clone Copilot's full UX in the first pass. Use labels and bot-style comment dispatch, publish one sticky PR review summary, and reserve deeper passes for opt-in or risky diffs.

## Revision Notes

- 2026-07-09: Initial assessment. Captures the preferred GitHub-first pattern: Kiro CLI as the review engine, selective dispatch via label or PR comment, and sticky PR comment publishing as the first write-back surface.
