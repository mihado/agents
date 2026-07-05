import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { parseDiff } from "./diff.js";
import { readBaseline, writeBaseline, mergeBaseline, isSuppressed } from "./baseline.js";
import { scanCodeFiles } from "./semgrep.js";
import { runSkillspectorWithProgress } from "./skillspector.js";
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

function runDiffCmd(command: string, commandArgs: string[]): string {
  const result = spawnSync(command, commandArgs, { encoding: "utf8", maxBuffer: 1024 * 1024 * 64 });
  if (result.status !== 0 && result.status !== 1 && result.status !== null) {
    console.error(`error: ${command} ${commandArgs.join(" ")} failed:\n${result.stderr}`);
    process.exit(1);
  }
  return result.stdout;
}

function getStagedDiffOutput(root: string): string | null {
  const stageDir = path.join(root, ".stage/skills");
  if (!fs.existsSync(stageDir)) return null;

  const parts: string[] = [];

  for (const catEntry of fs.readdirSync(stageDir, { withFileTypes: true })) {
    if (!catEntry.isDirectory()) continue;
    const catPath = path.join(stageDir, catEntry.name);
    for (const skillEntry of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!skillEntry.isDirectory()) continue;
      const relPath = `${catEntry.name}/${skillEntry.name}`;
      const stageTarget = `.stage/skills/${relPath}`;
      const liveTarget = `.agents/skills/${relPath}`;

      if (fs.existsSync(path.join(root, liveTarget))) {
        parts.push(runDiffCmd("git", [
          "-C", root, "diff", "--no-color", "--unified=0", "--no-index",
          liveTarget, stageTarget,
        ]));
      } else {
        const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-empty-"));
        try {
          parts.push(runDiffCmd("git", [
            "-C", root, "diff", "--no-color", "--unified=0", "--no-index",
            emptyDir, stageTarget,
          ]));
        } finally {
          fs.rmSync(emptyDir, { recursive: true, force: true });
        }
      }
    }
  }

  if (parts.length === 0) return null;
  const combined = parts.join("");
  return combined.replace(/^\+\+\+ b\/\.stage\/skills\//gm, "+++ b/.agents/skills/");
}

export function runVendorReview(opts: ReviewOptions): ReviewResult {
  const { root, accept, showSuppressed, withSkillspector } = opts;
  const baselinePath = path.join(root, "config", "skills", "vendor-review-baseline.json");
  const skillspectorBaselinePath = path.join(root, "config", "skills", "skillspector-baseline.yaml");

  const diffOutput = getStagedDiffOutput(root);

  if (diffOutput === null) {
    console.log("No skills in stage. Run `make vendor` to fetch skills.");
    writeArtifact(root, "vendor-review", "vendor-review", [], [], []);
    process.exit(0);
  }

  if (!diffOutput.trim()) {
    console.log("Staged content matches live tree — nothing to review.");
    writeArtifact(root, "vendor-review", "vendor-review", [], [], []);
    process.exit(0);
  }

  const { changedFiles, findings } = parseDiff(diffOutput);

  const codePaths = [...changedFiles.keys()].map((p) =>
    p.replace(/^\.agents\/skills\//, ".stage/skills/"),
  );
  const codeFindings = scanCodeFiles(root, codePaths)
    .map((f) => ({
      ...f,
      file: f.file.replace(/^\.stage\/skills\//, ".agents/skills/"),
    }))
    .filter((finding) =>
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
    skillspectorResult = runSkillspectorWithProgress(root, changedSkillDirs, "changed", skillspectorBaselinePath);
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
