import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseDiff } from "./diff.js";
import { readBaseline, writeBaseline, mergeBaseline, isSuppressed } from "./baseline.js";
import { scanCodeFiles } from "./semgrep.js";
import { runSkillspector } from "./skillspector.js";
import type { SkillspectorOutput } from "./skillspector.js";
import { writeArtifact } from "./artifact.js";
import type { Finding } from "../types.js";

export interface ReviewOptions {
  root: string;
  accept?: boolean;
  showSuppressed?: boolean;
  withSkillspector?: boolean;
}

export interface ReviewResult {
  newFindings: Finding[];
  suppressedCount: number;
  changedSkillDirs: string[];
}

function run(command: string, commandArgs: string[]): string {
  const result = spawnSync(command, commandArgs, { encoding: "utf8", maxBuffer: 1024 * 1024 * 64 });
  if (result.status !== 0 && result.status !== null) {
    console.error(`error: ${command} ${commandArgs.join(" ")} failed:\n${result.stderr}`);
    process.exit(1);
  }
  return result.stdout;
}

export function runVendorReview(opts: ReviewOptions): ReviewResult {
  const { root, accept, showSuppressed, withSkillspector } = opts;
  const baselinePath = path.join(root, "config", "skills", "vendor-review-baseline.json");
  const skillspectorBaselinePath = path.join(root, "config", "skills", "skillspector-baseline.yaml");

  const diffOutput = run("git", [
    "-C", root, "diff", "--no-color", "--unified=0", "HEAD", "--", ".agents/skills",
  ]);

  if (!diffOutput.trim()) {
    console.log(
      "No staged/unstaged changes under .agents/skills. Run after `make vendor` and before committing.",
    );
    writeArtifact(root, "vendor-review", "vendor-review", [], [], []);
    process.exit(0);
  }

  const { changedFiles, findings } = parseDiff(diffOutput);

  const codeFindings = scanCodeFiles(root, [...changedFiles.keys()]).filter((finding) =>
    changedFiles.get(finding.file)?.has(finding.lineNum ?? -1),
  );

  const allFindings = [...findings, ...codeFindings];

  const baseline = readBaseline(baselinePath);

  if (accept) {
    const changedPaths = [...changedFiles.keys()];
    writeArtifact(
      root, "vendor-review", "vendor-review --accept",
      parseSkillNames(diffOutput), allFindings, ["prose-scanner", "semgrep"], changedPaths,
    );
    writeBaseline(baselinePath, mergeBaseline(baseline, allFindings));
    console.log(`Accepted ${allFindings.length} finding(s) into ${path.relative(root, baselinePath)}.`);
    process.exit(0);
  }

  const newFindings = allFindings.filter((f) => !isSuppressed(baseline, f));
  const suppressed = allFindings.filter((f) => isSuppressed(baseline, f));

  if (newFindings.length === 0) {
    console.log(
      suppressed.length > 0
        ? `No new findings (${suppressed.length} already accepted in baseline).`
        : "No suspicious patterns found in newly added skill content.",
    );
  } else {
    console.log(`${newFindings.length} new finding(s) to review (advisory, not blocking):\n`);
    for (const { file, label, snippet } of newFindings) {
      console.log(`${file}\n  [${label}] ${snippet}\n`);
    }
    console.log(
      "Review each hit above. These are pattern matches, not proof of a problem — " +
        "vendored SKILL.md content is instructions an agent will follow, so read it as such.\n" +
        "If reviewed and accepted, run `make vendor-accept` to silence on future scans.",
    );
  }

  if (showSuppressed && suppressed.length > 0) {
    console.log(`\n${suppressed.length} suppressed finding(s) (in baseline):\n`);
    for (const { file, label, snippet } of suppressed) {
      console.log(`${file}\n  [${label}] ${snippet}\n`);
    }
  }

  const changedSkillDirs = findChangedSkillDirs(diffOutput);
  const skillNames = parseSkillNames(diffOutput);
  const reviewScanners = withSkillspector ? ["prose-scanner", "semgrep", "skillspector"] : ["prose-scanner", "semgrep"];

  let skillspectorResult: SkillspectorOutput | null = null;
  if (withSkillspector && changedSkillDirs.length > 0) {
    skillspectorResult = runSkillspector(root, changedSkillDirs, {
      baselinePath: skillspectorBaselinePath,
    });
    if (!skillspectorResult) {
      console.log("\nskillspector not available. Run `make deps` to install.");
    } else {
      console.log(
        `\nSkillspector (${skillspectorResult.label}, static-only --no-llm) on ${skillspectorResult.results.length} changed skill(s):\n`,
      );
      for (const r of skillspectorResult.results) {
        if (r.error) {
          console.log(`  ${path.basename(r.dir).padEnd(35)} error: ${r.error}`);
        } else {
          console.log(
            `  ${path.basename(r.dir).padEnd(35)} score=${String(r.score ?? "").padEnd(3)} severity=${String(r.severity ?? "").padEnd(8)} issues=${r.issueCount}`,
          );
        }
      }
    }
  }

  writeArtifact(
    root, "vendor-review", "vendor-review", skillNames, allFindings, reviewScanners, [...changedFiles.keys()], skillspectorResult,
  );

  return { newFindings, suppressedCount: suppressed.length, changedSkillDirs };
}

function parseSkillNames(diffOutput: string): string[] {
  const skillDirs = findChangedSkillDirs(diffOutput);
  return skillDirs.map((d) => d.replace(/^\.agents\/skills\//, ""));
}

function findChangedSkillDirs(diffOutput: string): string[] {
  const dirs = new Set<string>();
  for (const line of diffOutput.split("\n")) {
    const match = line.match(/^\+\+\+ b\/(\.agents\/skills\/[^/]+\/[^/]+)\//);
    if (match) dirs.add(match[1]);
  }
  return [...dirs];
}
