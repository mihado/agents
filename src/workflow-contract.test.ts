import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(fileURLToPath(import.meta.url), "../..");
const read = (relativePath: string): string => fs.readFileSync(path.join(root, relativePath), "utf8");

const conductor = read(".agents/skills/workflow/wf-conductor/SKILL.md");
const artifacts = read(".agents/skills/workflow/wf-conductor/references/artifacts.md");
const act = read(".agents/skills/workflow/wf-conductor/references/act.md");
const plan = read(".agents/skills/workflow/wf-conductor/references/plan.md");
const review = read(".agents/skills/workflow/wf-conductor/references/review.md");
const delegation = read(".agents/skills/workflow/wf-conductor/references/workspace-delegation.md");
const planning = read(".agents/skills/workflow/wf-planning/SKILL.md");
const execution = read(".agents/skills/workflow/wf-execution/SKILL.md");
const verification = read(".agents/skills/workflow/wf-verification/SKILL.md");
const commandSafety = read(".agents/skills/workflow/references/command-safety.md");
const unitContract = read(".agents/skills/workflow/wf-planning/references/unit-contract.md");
const actCommand = read("config/providers/opencode/commands/act.md");
const recovery = read(".agents/skills/workflow/wf-conductor/references/recovery.md");

describe("workflow contract", () => {
  it("anchors all dispatches to declared contained roots", () => {
    expect(conductor).toContain("`workspace_root` passed to every worker");
    expect(conductor).toContain("declared `repository_root`");
    expect(conductor).toContain("lexical containment");
    expect(conductor).toContain("resolved-path/symlink containment");
    expect(planning).toContain("Resolve repository evidence only under the declared `repository_root`");
    expect(execution).toContain("declared `repository_root`");
    expect(verification).toContain("Consume only conductor-declared inputs whose expected identity matches");
  });

  it("declares closed artifact inputs and persists reports before another worker consumes them", () => {
    expect(conductor).toContain("one compact, complete, ordered list of the declared project inputs");
    expect(conductor).toContain("The conductor persists every worker report at its canonical path before any dispatch that consumes it");
    expect(artifacts).toContain("## Dispatch inputs");
    expect(plan).toContain("Persist the returned report to `plans/<candidate-key>.adversarial-<n>.md`");
    expect(review).toContain("Persist the synthesized report");
  });

  it("keeps dispatch failures out of workflow authority and bounds retries", () => {
    expect(conductor).toContain("carries no domain, gate, readiness, lineage, acceptance, or revision-budget authority");
    expect(conductor).toContain("Retry once only, before any usable valid report, and only for read-only workers");
    expect(conductor).toContain("Operator and verifier dispatches receive no automatic retry");
    expect(artifacts).toContain("| Dispatch diagnostic | `work/<work-id>/dispatch/dispatch-<id>-attempt-<n>.md` | `dispatch-diagnostic` |");
  });

  it("keeps workspace delegation in one tally and repository adoption local", () => {
    expect(delegation).toContain("Tally: `.agent-contexts/delegations.md`. It is the sole workspace delegation authority");
    expect(delegation).toContain("The repository's conductor alone adopts by setting that pointer");
    expect(delegation).toContain("the manager never reads the repository pointer for status");
  });

  it("routes owned incomplete evidence into repair and plan defects into supersession", () => {
    expect(act).toContain("`implementation` with `Ownership: owned`, a concrete repair hypothesis, and safe retry conditions");
    expect(act).toContain("Missing materially applicable commands, evidence contracts, command classifications, target scope, preconditions, cleanup/recovery, or stop conditions are Plan defects");
    expect(act).toContain("Publish a superseding Plan with the Verify artifact as evidence before another execution attempt");
    expect(act).toContain("this does not consume the repair budget");
    expect(plan).toContain("`supersedes: plan-<prev>`");
    expect(plan).toContain("`supersession_reason: <what changed>`");
    expect(plan).toContain("the replaced Plan ID and the evidence or mismatch that motivated replacement");
  });

  it("limits automatic state repair to owned state", () => {
    expect(act).toContain("explicitly user-directed as a named test artifact");
    expect(act).toContain("A local configuration file, credential source, service, process, or environment value outside the declared test contract is external state");
    expect(commandSafety).toContain("Its ownership marker is its fixture declaration or the recorded user direction; it need not have been created by the current attempt");
    expect(commandSafety).toContain("Ambiguous state is external until the Plan or user establishes ownership");
  });

  it("requires actionable verifier routing and stateful command contracts", () => {
    expect(verification).toContain("### Evidence routing (required for non-`PASS` verdicts)");
    expect(verification).toContain("Omit the Evidence routing section");
    expect(commandSafety).toContain("owned state, ownership marker, preconditions, cleanup/recovery, and stop conditions");
    expect(unitContract).toContain("An ownership marker is a current-attempt creation marker or a fixture declaration or recorded user direction for a pre-existing named test artifact");
    expect(plan).toContain("Every configured verification command materially applicable to the slice is declared exactly, or recorded as inapplicable with scope-based reasoning");
  });

  it("keeps provider entrypoints subordinate to the conductor contract", () => {
    expect(actCommand).toContain("repair concrete, safe gaps in owned implementation evidence");
    expect(actCommand).toContain("apply every remaining stop rule from the conductor contract");
    expect(actCommand).not.toContain("`INCOMPLETE` and `BLOCKED` stop for disposition");
  });

  it("requires final verification to receive the complete declared acceptance evidence", () => {
    expect(act).toContain("the Brief and the final manifest");
    expect(act).toContain("the Brief, the final manifest, the final verification, and the Plan, Verify, and Review artifacts enumerated in the manifest's `accepted_slices`");
    expect(artifacts).toContain("| `final-review` | `final-<n>-review` | `[brief-<n>, final-<n>-manifest, final-<n>-verify, <all accepted slice Plan, Verify, and Review IDs>]` | `diff_base` |");
    expect(verification).toContain("Run all cumulative commands in order");
    expect(verification).toContain("Assess every Brief AC ID (both normal and `cumulative-only`)");
  });

  it("stops elevated planning when revisions turn circular", () => {
    expect(plan).toContain("continue revisions automatically while each persisted revision makes evidence-backed progress");
    expect(plan).toContain("The same `concern_origin` plus the same route with no recorded outcome progress is circular");
    expect(plan).toContain("`BLOCKED — planning loop`");
  });

  it("persists autonomous delivery authority through publication, recovery, and successor slices", () => {
    expect(conductor).toContain("Every conductor turn starts by reading `active.md` when active work exists");
    expect(conductor).toContain("the current user instruction — which overrides conflicting stored authority");
    expect(conductor).toContain("When the current instruction changes delivery mode, scope, pause state, or closure state, update `active.md` before dispatching or returning");
    expect(conductor).toContain("Before publication, execution, recovery, or successor-slice selection, re-read `active.md` as action authority");
    expect(conductor).toContain("sets `delivery_mode: autonomous` in `active.md`");
    expect(conductor).toContain("That mode authorizes ready Plan publication, Act, and successor slices without another publication prompt");
    expect(artifacts).toContain("delivery_mode: <approval-required | autonomous>");
    expect(recovery).toContain("In `autonomous` mode, one unambiguous ready draft is publication and execution authority");
    expect(plan).toContain("In `delivery_mode: autonomous`, publish and execute one unambiguous ready draft");
    expect(plan).toContain("plan, publish, and execute the next unambiguous ready slice");
  });
});
