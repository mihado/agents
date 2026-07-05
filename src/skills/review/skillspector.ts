import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import type { SemgrepInvocation } from "./semgrep.js";

export interface SkillspectorIssue {
  id: string;
  category: string;
  severity: string;
  confidence?: number;
  location?: {
    file?: string;
    start_line?: number;
    end_line?: number;
  };
  explanation?: string;
  remediation?: string;
  code_snippet?: string;
  tags?: string[];
}

export interface SkillspectorScanResult {
  dir: string;
  score?: number;
  severity?: string;
  issueCount?: number;
  issues?: SkillspectorIssue[];
  error?: string;
}

export interface SkillspectorOutput {
  label: string;
  results: SkillspectorScanResult[];
}

function resolveInvocation(root: string): SemgrepInvocation | null {
  const localBin = path.join(root, ".venv", "bin", "skillspector");
  if (fs.existsSync(localBin)) {
    return { command: localBin, label: "venv (uv sync)" };
  }
  if (spawnSync("which", ["skillspector"], { encoding: "utf8" }).status === 0) {
    return { command: "skillspector", label: "installed" };
  }
  return null;
}

export interface RunSkillspectorOptions {
  onProgress?: (dir: string, index: number, total: number) => void;
  baselinePath?: string;
}

export function runSkillspector(
  root: string,
  skillDirs: string[],
  { onProgress, baselinePath }: RunSkillspectorOptions = {},
): SkillspectorOutput | null {
  const invocation = resolveInvocation(root);
  if (!invocation) return null;

  const baselineArgs = baselinePath && fs.existsSync(baselinePath)
    ? ["--baseline", baselinePath]
    : [];

  const sorted = [...skillDirs].sort();
  const results: SkillspectorScanResult[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const relDir = sorted[i];
    if (onProgress) onProgress(relDir, i, sorted.length);

    const result = spawnSync(
      invocation.command,
      ["scan", relDir, "--no-llm", "--format", "json", ...baselineArgs],
      { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 64 },
    );

    if (result.status === 2 || result.error) {
      results.push({
        dir: relDir,
        error: result.stderr?.trim() || result.error?.message || "unknown",
      });
      continue;
    }

    try {
      const report = JSON.parse(result.stdout);
      const { score, severity } = report.risk_assessment ?? {};
      results.push({
        dir: relDir,
        score,
        severity,
        issueCount: report.issues?.length ?? 0,
        issues: report.issues ?? [],
      });
    } catch {
      results.push({ dir: relDir, error: "could not parse output" });
    }
  }

  return { label: invocation.label, results };
}

export function generateBaseline(root: string, skillsDir: string, outputPath: string, reason?: string): true | string {
  const invocation = resolveInvocation(root);
  if (!invocation) return "skillspector not available. Run `make deps` to install.";

  const result = spawnSync(
    invocation.command,
    [
      "baseline", skillsDir,
      "--no-llm", "--verbose",
      "-o", outputPath,
      "--reason", reason || `Accepted ${new Date().toISOString().slice(0, 10)}`,
    ],
    { cwd: root, encoding: "utf8", stdio: "inherit", maxBuffer: 1024 * 1024 * 64 },
  );

  if (result.status !== 0) {
    return result.stderr?.trim() || "skillspector baseline generation failed";
  }
  return true;
}

export function listAllSkillDirs(root: string): string[] {
  const skillsBase = path.join(root, ".agents/skills");
  if (!fs.existsSync(skillsBase)) return [];

  const dirs: string[] = [];
  for (const category of fs.readdirSync(skillsBase, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const catPath = path.join(skillsBase, category.name);
    for (const skill of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      dirs.push(path.relative(root, path.join(catPath, skill.name)));
    }
  }
  return dirs;
}
