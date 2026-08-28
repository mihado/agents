import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");

const read = (rel: string): string => fs.readFileSync(path.join(root, rel), "utf8");

const conductor = read(".agents/skills/workflow/wf-conductor/SKILL.md");
const artifactsRef = read(".agents/skills/workflow/wf-conductor/references/artifacts.md");
const planRef = read(".agents/skills/workflow/wf-conductor/references/plan.md");
const actRef = read(".agents/skills/workflow/wf-conductor/references/act.md");
const reviewRef = read(".agents/skills/workflow/wf-conductor/references/review.md");
const verifyRef = read(".agents/skills/workflow/wf-conductor/references/verify.md");
const delegationRef = read(".agents/skills/workflow/wf-conductor/references/workspace-delegation.md");
const researchSkill = read(".agents/skills/workflow/wf-research/SKILL.md");
const researchRef = read(".agents/skills/workflow/wf-research/references/research.md");
const adversarialRef = read(".agents/skills/workflow/wf-research/references/adversarial.md");
const judgeSkill = read(".agents/skills/workflow/wf-judge/SKILL.md");
const planningSkill = read(".agents/skills/workflow/wf-planning/SKILL.md");
const reviewSkill = read(".agents/skills/workflow/wf-review/SKILL.md");
const executionSkill = read(".agents/skills/workflow/wf-execution/SKILL.md");
const verificationSkill = read(".agents/skills/workflow/wf-verification/SKILL.md");
const providerDoc = read("docs/provider-workflow.md");

function expectPhrases(text: string, phrases: string[], label: string): void {
  for (const phrase of phrases) {
    expect(text, `${label} should contain: ${phrase}`).toContain(phrase);
  }
}

describe("workspace root canonicalization", () => {
  it("conductor resolves the canonical workspace root and passes workspace_root", () => {
    expectPhrases(conductor, [
      "starts from `$PWD` — canonicalized as the `invocation_dir` (`pwd -P` equivalent) —",
      "nearest enclosing directory containing `.agent-contexts/`",
      "need not be a Git worktree",
      "`workspace_root` passed to every worker",
      "resolves only under that canonical root",
      "lexical containment",
      "resolved-path/symlink containment",
    ], "conductor SKILL.md");
    expect(conductor).not.toContain("resolves the canonical Git worktree root");
  });

  it("workspace_root is not a singular repository source", () => {
    expectPhrases(conductor, [
      "`workspace_root` is not a repository source",
      "declared `repository_root` — an explicitly declared contained repository root, never a scan result",
      "repository evidence resolves only under it",
      "In a single-repository workspace `repository_root` equals `workspace_root`",
    ], "conductor SKILL.md");
  });

  it("conductor forbids searching outside the root, with documented exceptions", () => {
    expectPhrases(conductor, [
      "must not search `$HOME`, `/`, parent directories, or unrelated roots to discover project artifacts",
      "does not apply to official documentation URLs, permitted network access, or installed executable/tool paths",
    ], "conductor SKILL.md");
  });

  it("research workers are bound to the declared workspace", () => {
    expectPhrases(researchSkill, [
      "only under the `workspace_root` declared in the dispatch envelope",
      "only under the declared `repository_root`",
      "lexical containment and resolved-path/symlink containment",
      "Do not search `$HOME`, `/`, parent directories, or unrelated roots",
    ], "wf-research SKILL.md");
    expectPhrases(researchRef, [
      "only under the declared `repository_root`",
      "Official documentation URLs, permitted network access, and installed executable/tool paths are unaffected",
    ], "references/research.md");
    expectPhrases(adversarialRef, [
      "only under the declared `repository_root`",
      "Official documentation URLs, permitted network access, and installed executable/tool paths are unaffected",
    ], "references/adversarial.md");
  });

  it("planning and review workers resolve evidence only under workspace_root", () => {
    expectPhrases(planningSkill, [
      "Resolve repository evidence only under the declared `repository_root`",
      "never search `$HOME`, `/`, or parent directories for project artifacts",
    ], "wf-planning SKILL.md");
    expectPhrases(reviewSkill, [
      "Resolve the diff and surrounding code only under the declared `repository_root`",
      "do not search `$HOME`, `/`, parent directories, or unrelated roots",
    ], "wf-review SKILL.md");
  });
  it("operator and verifier workers resolve evidence only under workspace_root", () => {
    for (const [label, text] of [
      ["wf-execution SKILL.md", executionSkill],
      ["wf-verification SKILL.md", verificationSkill],
    ] as const) {
      expectPhrases(text, [
        "canonical `workspace_root`",
        "declared `repository_root`",
        "lexical containment",
        "resolved-path/symlink containment",
        "Official documentation, permitted network access, and installed tools are unaffected",
      ], label);
    }
  });
});

describe("workspace delegation", () => {
  it("conductor routes the multi-repo model to the single authority", () => {
    expect(conductor).toContain("[references/workspace-delegation.md](references/workspace-delegation.md) § Workspace model");
  });

  it("workspace-delegation.md is the single authority for the delegation protocol", () => {
    expectPhrases(delegationRef, [
      "Single authority for multi-repo workspace delegation",
      "A workspace that does not delegate skips this protocol entirely",
      "need not be a Git worktree",
      "never re-derived from `git` state or a repository scan",
      "`$PWD`, canonicalized, is the `invocation_dir`",
      "nearest enclosing directory containing `.agent-contexts/`",
      "After bootstrap the workspace root is resolved only by the nearest-`.agent-contexts/` rule — `git` is never consulted again",
    ], "references/workspace-delegation.md");
    expect(delegationRef).not.toContain("delegations/<delegation-id>");
    expect(delegationRef).not.toContain("record.md");
  });

  it("the tally is the sole authority and one row carries the full mapping", () => {
    expectPhrases(delegationRef, [
      "Tally: `.agent-contexts/delegations.md`",
      "sole workspace delegation authority",
      "There are no per-delegation directories or records",
      "One row maps the workspace's `workspace_work_id`",
      "declared, contained `repository_root` (exact)",
      "stable `repository_work_id`",
      "exact `repository_work_dir`",
      "published Brief/Plan paths",
      "`last_observed_state` with its observation time and `last_observed_artifacts`",
      "`dispatched` and `adopted` are nonterminal",
      "The workspace manager is the sole writer of the tally and of the manager-published artifacts",
      "distinct stable `repository_work_id`s",
      "`(repository_root, repository_work_id)` must be unique in the tally",
    ], "references/workspace-delegation.md");
  });

  it("status is derived from the row's repository child artifacts, never the repository pointer", () => {
    expectPhrases(delegationRef, [
      "A status request reads every nonterminal row's exact `repository_work_dir` and its artifacts",
      "never from the repository's `active.md`",
      "updates the same tally row's `last_observed_state`, observation time, and `last_observed_artifacts`",
      "an adoption it cannot observe stays `dispatched` until repository activity becomes visible",
      "A terminal observed state never regresses in the sole-writer tally",
      "Terminal rows are not re-read except after an explicit new user decision",
    ], "references/workspace-delegation.md");
  });

  it("publish appends into the exact child directory only", () => {
    expectPhrases(delegationRef, [
      "declared explicitly in the tally",
      "Repositories are never discovered by scanning",
      "publishes it into the row's exact `repository_work_dir`",
      "the repository's canonical artifact filenames and lineage",
      "reads only that exact `repository_work_dir` — never repository-wide `.agent-contexts`, the repository pointer, or any scan",
      "appends exactly `brief-<next>.md` or `plans/plan-<next>.md`",
      "highest number of that kind in that exact child directory +1",
      "The manager creates the next file exclusively",
      "on a filename collision it rereads only that exact child directory and retries the allocation, never overwriting",
      "it never overwrites or revises an existing repository artifact",
      "Workspace-side numbering is never mixed into repository artifacts",
      "Adoption completes when the repository's local `active.md` points at the published artifact",
      "The repository's conductor alone adopts by setting that pointer",
      "the workspace manager never writes the repository's active pointer",
      "the manager never reads the repository pointer for status",
      "the manager never edits adopted or repository-created artifacts — including the repository pointer",
    ], "references/workspace-delegation.md");
  });

  it("row opening validates the exact repository work dir before appending", () => {
    expectPhrases(delegationRef, [
      "On opening a row, the manager validates the exact `repository_work_dir`",
      "every entry beneath it is a valid canonical workflow artifact at its canonical location (canonical paths and envelope per [artifacts.md](artifacts.md))",
      "every artifact carries `work_id: <repository-work-id>` plus `parent_work_id: <workspace-work-id>` matching this workspace work",
      "Any unrecognized entry, non-artifact content, malformed artifact, or unexpected nested content returns `BLOCKED — delegation conflict`",
      "the manager does not append",
      "Stable same-ID re-delegation of the same workspace work passes this validation",
    ], "references/workspace-delegation.md");
  });

  it("published artifacts carry the workspace parent identity", () => {
    expect(delegationRef).toContain("with the repository's canonical artifact filenames and lineage, and an envelope carrying `work_id: <repository-work-id>` plus `parent_work_id: <workspace-work-id>`");
  });

  it("the tally runs on the single-active-manager assumption without locks", () => {
    expect(delegationRef).toContain("Operational assumption: one active workspace manager writes the workspace tally; no locks or compare-and-swap are defined");
  });

  it("prohibited delegation mechanisms are named", () => {
    expect(delegationRef).toContain("no body copies across roots, no symlinks, no inbox directories, no receipts, no per-delegation directories or status files, and no manager-specific artifact filenames in a repository");
  });
});

describe("dispatch envelope", () => {
  it("conductor defines the minimal envelope for every configured worker dispatch", () => {
    expectPhrases(conductor, [
      "Every configured worker dispatch — `planner`, `planner-adversarial`, `judge`, `reviewer`, `reviewer-adversarial`, `operator`, and `verifier` (research uses the planner bindings) — carries the minimal dispatch envelope",
      "`dispatch_id`",
      "canonical `workspace_root`",
      "declared `repository_root` — the canonical root of the explicitly declared contained repository this dispatch targets",
      "it equals `workspace_root` in a single-repository workspace",
      "`observed_target`",
    ], "conductor SKILL.md");
  });

  it("artifact-consuming dispatches additionally carry closed validated inputs", () => {
    expectPhrases(conductor, [
      "Artifact-consuming dispatches — the read-only workers above and the verifier — additionally carry `inputs`: one compact, complete, ordered list of the declared project inputs",
      "The first pass sends no artifact bodies",
      "One retry may attach only the matching validated bodies for declared inputs",
      "retry behavior is otherwise unchanged",
      "Workers consume only the declared project inputs; the judge stays supplied-reports-only",
      "The conductor persists every worker report at its canonical path before any dispatch that consumes it",
      "judges receive only those persisted report paths",
    ], "conductor SKILL.md");
  });

  it("artifacts.md is the authoritative dispatch-inputs schema", () => {
    expect(conductor).toContain("[references/artifacts.md](references/artifacts.md) § Dispatch inputs");
    expectPhrases(artifactsRef, [
      "## Dispatch inputs",
      "compact, complete, ordered `inputs` list",
      "canonical `workspace_root`, declared `repository_root`, and `observed_target`",
      "`path` — root-relative to `workspace_root`",
      "lexical containment and resolved-path/symlink containment",
      "Repository evidence (diffs, source, commands) resolves under the declared `repository_root`",
      "A retry may attach only the matching validated bodies for declared inputs",
      "never substitute, reorder, or extend the list",
      "every project artifact the worker must consume is declared in it",
    ], "references/artifacts.md");
  });

  it("workers consume the declared artifact from the envelope", () => {
    expectPhrases(researchSkill, [
      "use the declared artifact at its declared root-relative path",
    ], "wf-research SKILL.md");
    expectPhrases(planningSkill, [
      "read the declared Brief or draft at its declared `workspace_root`-relative path",
    ], "wf-planning SKILL.md");
    expectPhrases(reviewSkill, [
      "Use the declared artifacts from the dispatch envelope",
    ], "wf-review SKILL.md");
  });

  it("judge stays supplied-reports-only", () => {
    expectPhrases(judgeSkill, [
      "Reports arrive through conductor dispatch envelopes",
      "Read the declared reports only at their declared `workspace_root`-relative paths",
      "the judge stays supplied-reports-only and never inspects the repository, source code, or other roots",
    ], "wf-judge SKILL.md");
    expect(planRef).toContain("The judge stays supplied-reports-only");
    expect(reviewRef).toContain("The judge stays supplied-reports-only");
  });

  it("plan and review references dispatch envelopes to read-only workers", () => {
    expectPhrases(planRef, [
      "the dispatch envelope whose validated ordered declared inputs are the active Brief",
      "the dispatch envelope whose validated ordered declared inputs are the active Brief and the persisted draft Plan",
      "the dispatch envelope whose validated ordered declared inputs are the active Brief and the persisted candidate draft Plan",
      "the dispatch envelope whose validated ordered declared inputs are the current Brief, the current draft, and the relevant persisted adjudication or final-gate report paths",
      "the dispatch envelope whose closed declared inputs are the persisted draft Plan and the persisted adversarial report",
    ], "references/plan.md");
    expectPhrases(reviewRef, [
      "the dispatch envelope whose closed ordered declared inputs are the present artifacts from the declared reviewer inputs (below)",
      "each receiving the same closed ordered declared input list from the declared reviewer inputs (below)",
      "the dispatch envelope whose closed declared inputs are the two persisted review reports",
    ], "references/review.md");
  });

  it("planner dispatch inputs are validated under artifacts.md § Dispatch inputs", () => {
    expect(planRef).toContain("Every planner dispatch below is artifact-consuming");
    expect(planRef).toContain("validated under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity) before dispatch");
    expect(planRef).not.toContain("the dispatch envelope for the active Brief");
    expect(planRef).not.toContain("the dispatch envelope for the persisted draft Plan");
    expect(planRef).not.toContain("and its dispatch envelope");
  });
});

describe("elevated review declared inputs", () => {
  it("both elevated reviewers receive the same closed ordered input list of present artifacts", () => {
    expectPhrases(reviewRef, [
      "both reviewers receive the same closed ordered input list of present artifacts",
      "never declare an absent artifact or an undeclared extra",
      "Validate every declared input under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity) before dispatch",
      "In-loop (during Act): the Brief, the current Plan, and the attempt's verifier evidence",
      "Standalone (`/review` outside Act): the Brief, plus the Plan and verifier evidence only when the invocation supplies them",
    ], "references/review.md");
  });

  it("the vague in-loop-only input phrasing is gone", () => {
    expect(reviewRef).not.toContain("the dispatch envelope for the Brief, Plan, and verifier evidence");
    expect(reviewRef).not.toContain("each with its dispatch envelope");
  });

  it("standalone review resolves optional artifacts only when supplied", () => {
    expect(reviewRef).toContain("Standalone `/review` resolves the Brief unconditionally; it resolves and declares a Plan or verifier evidence only when the invocation supplies it");
  });
});

describe("persisted worker reports", () => {
  it("adversarial plan reports, adjudications, and elevated review reports have canonical paths and roles", () => {
    expectPhrases(artifactsRef, [
      "| Adversarial plan report | `work/<work-id>/plans/<candidate-key>.adversarial-<n>.md` | `plan-adversarial` |",
      "| Plan adjudication | `work/<work-id>/plans/<candidate-key>.adjudication-<n>.md` | `plan-adjudication` |",
      "| Elevated review report (standards, in-loop) | `work/<work-id>/execution/attempt-<n>/review-standards.md` | `review` |",
      "| Elevated review report (adversarial, in-loop) | `work/<work-id>/execution/attempt-<n>/review-adversarial.md` | `review` |",
      "| Elevated review report (standards, standalone) | `work/<work-id>/reviews/review-<n>-standards.md` | `standalone-review` |",
      "| Elevated review report (adversarial, standalone) | `work/<work-id>/reviews/review-<n>-adversarial.md` | `standalone-review` |",
      "| Review (standalone) | `work/<work-id>/reviews/review-<n>.md` | `standalone-review` |",
    ], "references/artifacts.md");
    expect(artifactsRef).toContain("| `plan-adversarial` | `<candidate-key>-adversarial-<n>` | `[brief-<n>, draft-<candidate-key>]` | — |");
    expect(artifactsRef).toContain("| `plan-adjudication` | `<candidate-key>-adjudication-<n>` | `[draft-<candidate-key>, <candidate-key>-adversarial-<n>]` | — |");
    expect(artifactsRef).toContain("| `review` | `attempt-<n>-review` (in-loop elevated reports: `attempt-<n>-review-standards` / `attempt-<n>-review-adversarial`) | `[plan-<n>, attempt-<n>-verify]`; the synthesized two-reviewer result adds both elevated report IDs | — |");
    expect(artifactsRef).toContain("| `standalone-review` | `review-<n>` (elevated reports: `review-<n>-standards` / `review-<n>-adversarial`) | `[brief-<n>]`, extended by a `plan-<n>` and/or `attempt-<m>-verify` entry for each Plan/verifier artifact the invocation supplies; the synthesized two-reviewer result adds both elevated report IDs | `diff_ref` |");
  });

  it("research report paths and roles are preserved", () => {
    expect(artifactsRef).toContain("| Constructive research | `work/<work-id>/research/research-<n>/planner.md` | `research-report` |");
    expect(artifactsRef).toContain("| Adversarial research | `work/<work-id>/research/research-<n>/planner-adversarial.md` | `research-report` |");
    expect(artifactsRef).toContain("| Research synthesis | `work/<work-id>/research/research-<n>/synthesis.md` | `research-synthesis` |");
  });

  it("plan reference persists each report before dispatching the next worker", () => {
    expectPhrases(planRef, [
      "Persist the returned report to `plans/<candidate-key>.adversarial-<n>.md` with `artifact_role: plan-adversarial` (next `<n>` for that candidate) before dispatching the judge",
      "Persist the adjudication to `plans/<candidate-key>.adjudication-<n>.md` with `artifact_role: plan-adjudication`",
      "Persist the returned report to the next `plan-adversarial` path before routing",
      "and the persisted final adversarial report path",
    ], "references/plan.md");
  });

  it("the revision loop consumes persisted adjudication and final-gate report paths", () => {
    expect(planRef).toContain("the current Brief, the current draft, and the relevant persisted adjudication or final-gate report paths");
  });

  it("review reference makes the conductor persist every returned review report", () => {
    expectPhrases(reviewRef, [
      "With one reviewer, persist its returned report at the canonical path for the review mode",
      "persist the standards report to `execution/attempt-<n>/review-standards.md` and the adversarial report to `execution/attempt-<n>/review-adversarial.md` (both `artifact_role: review`)",
      "Persist the synthesized report to `execution/attempt-<n>/review.md` (`artifact_role: review`) in-loop or `reviews/review-<n>.md` (`artifact_role: standalone-review`) standalone",
    ], "references/review.md");
  });

  it("standalone elevated reports persist under reviews/ with the standalone-review role before the judge", () => {
    expectPhrases(reviewRef, [
      "persist the standards report to `reviews/review-<n>-standards.md` and the adversarial report to `reviews/review-<n>-adversarial.md` (both `artifact_role: standalone-review`)",
      "`<n>` matches the episode's synthesized `reviews/review-<n>.md`",
    ], "references/review.md");
    const inLoopBranch = reviewRef.indexOf("persist the standards report to `execution/attempt-<n>/review-standards.md`");
    const standaloneBranch = reviewRef.indexOf("persist the standards report to `reviews/review-<n>-standards.md`");
    const judgeDispatch = reviewRef.indexOf("require `judge`");
    expect(inLoopBranch).toBeGreaterThan(-1);
    expect(standaloneBranch).toBeGreaterThan(inLoopBranch);
    expect(judgeDispatch).toBeGreaterThan(standaloneBranch);
  });
});

describe("dispatch failure", () => {
  it("conductor classifies failures and denies gate/budget authority", () => {
    expectPhrases(conductor, [
      "Path, input, transport, and report-envelope errors are `DISPATCH_FAILURE`",
      "carries no domain, gate, readiness, lineage, acceptance, or revision-budget authority",
      ".agent-contexts/work/<work-id>/dispatch/dispatch-<id>-attempt-<n>.md",
      "`artifact_role: dispatch-diagnostic`",
      "`artifact_id: dispatch-<id>-attempt-<n>`",
      "diagnostics are immutable evidence, so the post-retry diagnostic never overwrites the first",
      "envelope and provenance, failure class, reason, retry link and ordinal, and timestamps",
      "Retry once only, before any usable valid report, and only for read-only workers",
      "Operator and verifier dispatches receive no automatic retry: their dispatch failure is `BLOCKED`, and existing attempt rules remain",
    ], "conductor SKILL.md");
  });

  it("artifacts reference registers the dispatch-diagnostic artifact", () => {
    expect(artifactsRef).toContain("| Dispatch diagnostic | `work/<work-id>/dispatch/dispatch-<id>-attempt-<n>.md` | `dispatch-diagnostic` |");
    expect(artifactsRef).toContain("| `dispatch-diagnostic` | `dispatch-<id>-attempt-<n>` | `[]` | `dispatch_id`, `failure_class`, `reason`, `retry_of`, `retry_ordinal`, `failed_at` |");
  });

  it("a second read-only dispatch failure after the inline retry is terminal", () => {
    expectPhrases(conductor, [
      "persists a second diagnostic and returns `BLOCKED — DISPATCH_FAILURE`",
      "no report and no enclosing gate advances",
    ], "conductor SKILL.md");
    expect(actRef).toContain("a second failure persists a second diagnostic and returns `BLOCKED — DISPATCH_FAILURE`");
  });

  it("act reference blocks operator and verifier dispatch failures", () => {
    expectPhrases(actRef, [
      "Operator and verifier dispatches receive no automatic retry — a dispatch failure on either is `BLOCKED`",
      "no domain, gate, readiness, lineage, acceptance, or revision-budget authority",
    ], "references/act.md");
  });

  it("verify reference blocks verifier dispatch failures", () => {
    expectPhrases(verifyRef, [
      "The verifier receives no automatic retry",
      "a verifier `DISPATCH_FAILURE` is `BLOCKED`",
    ], "references/verify.md");
  });

  it("read-only lane references retry once", () => {
    expect(planRef).toContain("persist the diagnostic, and retry once only because planning workers are read-only");
    expect(reviewRef).toContain("retry once with the same validated artifact bodies before any usable valid report");
  });
});

describe("user blocker classifier", () => {
  it("conductor defines the precedence order", () => {
    const markers = [
      "1. Explicit user-owned decision.",
      "2. Scope or acceptance criteria.",
      "3. Safety, non-functional requirement, privacy, or security boundary.",
      "4. Public-contract semantic change.",
      "5. Publication, abandonment, or workflow exception.",
      "6. Otherwise: implementation mechanics.",
    ];
    expectPhrases(conductor, markers, "conductor SKILL.md");
    const positions = markers.map((m) => conductor.indexOf(m));
    expect([...positions].sort((a, b) => a - b)).toEqual(positions);
  });

  it("conductor enumerates mechanics and automatic continuation", () => {
    expectPhrases(conductor, [
      "Implementation mechanics include local APIs, package signatures and compatibility, naming and file layout, DTOs, and fixture and evidence/test mechanics",
      "Continue automatically through research or planner revision unless supported evidence changes a settled boundary",
    ], "conductor SKILL.md");
  });

  it("plan reference classifies concerns before each revision", () => {
    expect(planRef).toContain("classify every cited concern: `revise-plan` / `research` / `Think` / genuine user decision / `BLOCKED`");
    expect(planRef).toContain("Route bounded factual or compatibility questions to Research and resume Plan");
    expect(conductor).toContain("Classify `replan-required` under the user blocker classifier");
  });

  it("in-loop review replan-required routes through the blocker classifier", () => {
    expectPhrases(actRef, [
      "classify the finding under the user blocker classifier",
      "route implementation mechanics through Research or Plan",
      "return boundary-changing evidence to Think",
      "stop only for a genuine user-owned decision",
    ], "references/act.md");
    expect(actRef).toContain("`human-decision-required`: stop for the stated decision.");
    expect(actRef).not.toContain("`replan-required` or `human-decision-required`: stop for the stated disposition.");
  });
});

describe("verifier declared inputs", () => {
  it("slice verifier dispatch carries the envelope plus validated ordered declared inputs", () => {
    expectPhrases(actRef, [
      "Send the configured `operator` with `Required skill: wf-execution`, the minimal dispatch envelope — `dispatch_id`, canonical `workspace_root`, declared `repository_root`, `observed_target` — and the settled Plan, Brief, and any concrete prior finding when repairing",
      "the Plan and Brief ride as dispatch content, not declared `inputs`",
      "Send the configured `verifier` with `Required skill: wf-verification`, `Mode: slice`, the dispatch envelope, and validated ordered declared inputs — the Brief, Plan, and operator result",
      "Validate them under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity)",
    ], "references/act.md");
  });

  it("standalone /verify declares every supplied project artifact as validated ordered inputs", () => {
    expectPhrases(verifyRef, [
      "the dispatch envelope, and validated ordered declared inputs — the Brief and Plan, plus any operator result or evidence artifact this flow supplies",
      "Validate every supplied project artifact under [references/artifacts.md](artifacts.md) § Dispatch inputs (path containment and expected frontmatter identity)",
    ], "references/verify.md");
  });
});

describe("final gate dispatches", () => {
  it("final verify receives the Brief and final manifest as ordered declared inputs with no retry", () => {
    expectPhrases(actRef, [
      "the dispatch envelope, and validated ordered declared inputs — the Brief and the final manifest",
      "Validate them under [references/artifacts.md](artifacts.md) § Dispatch inputs",
      "full AC bodies and contracts",
      "No retry",
    ], "references/act.md");
    expect(verificationSkill).toContain("Consume only conductor-declared inputs whose expected identity matches");
  });

  it("final review receives a closed ordered declared input set and one read-only retry", () => {
    expectPhrases(actRef, [
      "the dispatch envelope, and a closed ordered declared input set",
      "the Brief, the final manifest, the final verification, and the Plan, Verify, and Review artifacts enumerated in the manifest's `accepted_slices`",
      "One read-only retry",
    ], "references/act.md");
  });

  it("final review lineage declares every consumed input", () => {
    expect(artifactsRef).toContain("| `final-review` | `final-<n>-review` | `[brief-<n>, final-<n>-manifest, final-<n>-verify, <all accepted slice Plan, Verify, and Review IDs>]` | `diff_base` |");
  });

  it("the cumulative diff is command/source context, not an artifact input", () => {
    expectPhrases(actRef, [
      "command/source context computed from `repository_root` and the manifest's `diff_base`",
      "not an artifact input",
    ], "references/act.md");
  });
});

describe("planner revision loop", () => {
  it("plan reference removes the numeric revision cap and its budget language", () => {
    expect(planRef).not.toContain("One revision round maximum");
    expect(planRef).not.toMatch(/at most three|three persisted/);
    expect(planRef).not.toContain("budget");
    expect(planRef).not.toContain("Exhaustion");
  });

  it("plan reference continues the loop only on evidence-backed progress", () => {
    expectPhrases(planRef, [
      "continue revisions automatically while each persisted revision makes evidence-backed progress on the concrete cited concerns",
      "it resolves, narrows, or disproves them with evidence",
      "A wording-only revision is no progress",
      "Dispatch failures do not count as revisions or progress",
    ], "references/plan.md");
  });

  it("plan reference detects circular loops against the immediately prior revision", () => {
    expectPhrases(planRef, [
      "compare the current cited concerns and the prior progress record against the immediately prior persisted revision",
      "The same `concern_origin` plus the same route with no recorded outcome progress is circular",
      "a renamed or rephrased concern remains the same concern when it matches an existing `concern_origin` under the matching rule above, even though the citing report's path/ID differs",
      "the same concern remains materially unchanged",
      "the proposed route repeats a prior failed route without new evidence",
      "evidence establishes a user-owned boundary change",
      "The accumulated progress record in `revision_summary` is the durable input for this stop",
    ], "references/plan.md");
  });

  it("plan reference requires a revision_summary progress record for elevated revisions", () => {
    expectPhrases(planRef, [
      "Each elevated persisted draft revision extends its existing `revision_summary` with a compact progress record for every cited concern",
      "the concern identifier or short statement",
      "`concern_origin` (the persisted report path/ID plus finding identifier for the first report raising that concern)",
      "A later report raising the same unresolved concern retains that `concern_origin` and records its current source path/ID alongside it",
      "The conductor matches a successor report concern to an existing origin by the exact finding identifier when the successor carries one",
      "otherwise by the same normalized concern plus the same affected scope or acceptance criterion",
      "an ambiguous match is `BLOCKED — planning loop` rather than a guess",
      "the route attempted",
      "the evidence-backed outcome (`resolved`, `narrowed`, `disproved`, or `no-progress`)",
      "`no-progress` records an attempted route that did not advance the cited concern",
      "on the next same-origin, same-route comparison the conductor returns `BLOCKED — planning loop`",
      "appending to the prior entries",
      "Elevated revision-loop revisions extend `revision_summary` with the per-concern progress record",
      "ordinary drafts and lightweight revisions keep a concise `revision_summary`",
    ], "references/plan.md");
  });

  it("artifacts reference scopes the progress record to revision_summary with no separate artifact", () => {
    expectPhrases(artifactsRef, [
      "Elevated revision-loop revisions append a compact progress record to `revision_summary` for every cited concern",
      "`concern_origin` (the persisted report path/ID plus finding identifier for the first report raising that concern; later reports raising the same unresolved concern retain that `concern_origin` and record their current source path/ID alongside)",
      "the route attempted, and the evidence-backed outcome (`resolved`, `narrowed`, `disproved`, or `no-progress`)",
      "preserving prior entries",
      "The record lives inside `revision_summary`",
      "no separate progress artifact is created",
    ], "references/artifacts.md");
    expect(artifactsRef).toContain("`revision_summary` (elevated revision-loop revisions append the per-concern progress record)");
  });

  it("elevated readiness rework cites failing checklist items with draft-origin concerns and pre-dispatch progress records", () => {
    expectPhrases(planRef, [
      "A structural readiness rework has no persisted report inputs; its declared inputs are the current Brief and the current draft, and its cited concerns are the failing checklist items",
      "A structural readiness failure has no persisted report: each failing checklist item is a cited concern whose `concern_origin` combines the persisted draft artifact ID and revision of the first failing gate run with the checklist item number",
      "Before each planner rework dispatch, append the normal progress record for every failing checklist item to the draft's existing `revision_summary`",
      "the current failing draft revision as its source",
      "including `no-progress` when a rework leaves the item failing unchanged",
      "a later failing gate run of the same checklist item retains that `concern_origin` and records its current revision alongside it",
      "repeated same-origin, same-route `no-progress` blocks under the circularity check below",
    ], "references/plan.md");
    expectPhrases(artifactsRef, [
      "A structural readiness concern's `concern_origin` combines the persisted draft artifact ID and revision with the checklist item number instead of a report path/ID",
    ], "references/artifacts.md");
  });

  it("plan reference stops circular loops without converting the stop into user intervention", () => {
    expectPhrases(planRef, [
      "stop automatic planner revision",
      "Route a user-owned boundary change through the user blocker classifier",
      "`BLOCKED — planning loop` naming the repeated concern or route and the supporting evidence",
      "A circular-loop stop is a conductor decision, not a user question",
    ], "references/plan.md");
  });

  it("plan reference requires readiness re-runs and the shared loop", () => {
    expectPhrases(planRef, [
      "re-run the structural readiness gate after each persisted revision",
      "the final adversarial check feeds the same loop",
      "`actionable-concerns` re-enters classification and revision while the loop continues",
      "the standard checklist is run as a precondition before the initial adversarial review, after each persisted revision, and before the final gate",
    ], "references/plan.md");
  });

  it("plan reference defines the explicit revision operation", () => {
    expectPhrases(planRef, [
      "dispatch `planner` with `Required skill: wf-planning`, `Mode: execution`",
      "the current Brief, the current draft, and the relevant persisted adjudication or final-gate report paths",
      "Persist the returned proposal as the next in-place revision",
      "routes directly to the final adversarial check (step 5) — never back to adjudication (step 3)",
    ], "references/plan.md");
  });
});

describe("elevated planning flow ordering", () => {
  it("the structural readiness gate runs before the initial adversarial dispatch", () => {
    const readiness = planRef.indexOf("Immediately after persisting the initial draft, run the structural readiness gate");
    const initialAdversarial = planRef.indexOf("Dispatch `planner-adversarial` with `Required skill: wf-planning`, `Mode: adversarial`");
    expect(readiness).toBeGreaterThan(-1);
    expect(initialAdversarial).toBeGreaterThan(readiness);
    expectPhrases(planRef, [
      "Only on a gate pass dispatch the initial planner-adversarial review (step 2)",
      "do not dispatch the elevated review (steps 2–3) until the gate passes",
      "it does not set `readiness: ready`",
    ], "references/plan.md");
  });

  it("a judge revise-plan revision routes straight to the final gate, not adjudication", () => {
    expect(planRef).not.toContain("return to adjudication");
    expectPhrases(planRef, [
      "enter the revision loop (below), which routes the revision directly to the final gate (step 5) — never back to adjudication (step 3)",
      "a revision following adjudication `revise-plan` or final-gate `actionable-concerns` routes directly to the final adversarial check (step 5) — never back to adjudication (step 3)",
    ], "references/plan.md");
  });

  it("a final-gate revision returns to the final gate", () => {
    expectPhrases(planRef, [
      "feed the same revision loop, which returns the revision to this final gate",
      "the final adversarial check feeds the same loop",
    ], "references/plan.md");
  });
});

describe("provider workflow documentation", () => {
  it("maps workspace addressing, dispatch failure, and the revision loop", () => {
    expectPhrases(providerDoc, [
      "the workspace need not be a Git worktree",
      "declares a contained `repository_root`",
      "never `$HOME`, `/`, or unrelated roots",
      "dispatch envelope",
      "`DISPATCH_FAILURE`",
      "operator and verifier dispatch failures are `BLOCKED`",
      "an adjudication and revision loop, shared across adjudication and final-gate feedback",
      "continues while each persisted planner revision makes evidence-backed progress",
      "stops as `BLOCKED — planning loop` once the loop turns circular",
      "dispatch failures never count as revisions or progress",
      "dispatch-<id>-attempt-<n>.md ← conductor diagnostic for a failed dispatch",
    ], "docs/provider-workflow.md");
    expect(providerDoc).not.toMatch(/at most three|three persisted/);
  });

  it("maps multi-repo delegation to the tally and local active pointer", () => {
    expectPhrases(providerDoc, [
      "publishes normal Brief/Plan artifacts into the target repository's stable work directory",
      "sole writer of the tally and its published artifacts",
      "unique `(repository_root, repository_work_id)` rows",
      "adoption completes through the repository's local `active.md` pointer",
      "set only by the repository's conductor",
      "status requests update the tally at `.agent-contexts/delegations.md` from each nonterminal row's exact repository child work dir — never the repository's `active.md`",
      "references/workspace-delegation.md",
    ], "docs/provider-workflow.md");
  });

  it("maps the blocker-classification precedence", () => {
    expectPhrases(providerDoc, [
      "explicit user-owned decision, scope or acceptance criteria, safety/non-functional/privacy/security boundary, public-contract semantic change, publication/abandonment/workflow exception, then implementation mechanics",
      "local APIs, package signatures and compatibility, naming and file layout, DTOs, fixture and evidence/test mechanics",
      "Mechanics continue automatically through research or planner revision unless supported evidence changes a settled boundary",
    ], "docs/provider-workflow.md");
  });
});

describe("provider wrappers do not restate workflow policy", () => {
  const agentsDir = path.join(root, "config/providers/opencode/agents");
  const wrappers = fs.readdirSync(agentsDir).filter((f) => f.endsWith(".md")).sort();
  const policyPhrases = ["workspace_root", "repository_root", "DISPATCH_FAILURE", "pwd -P", "dispatch envelope", "dispatch_id", "dispatch-diagnostic"];

  it("every configured wrapper is scanned", () => {
    expect(wrappers).toEqual([
      "conductor.md", "judge.md", "operator.md", "planner-adversarial.md",
      "planner.md", "reviewer-adversarial.md", "reviewer.md", "verifier.md",
    ]);
  });

  it("wrappers delegate policy to the workflow skills instead of restating it", () => {
    for (const wrapper of wrappers) {
      const text = read(`config/providers/opencode/agents/${wrapper}`);
      for (const phrase of policyPhrases) {
        expect(text, `${wrapper} must not restate policy phrase: ${phrase}`).not.toContain(phrase);
      }
    }
  });
});
