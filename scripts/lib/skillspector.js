// Skillspector integration for vendor-review and vendor-audit.
//
// Resolves skillspector from the repo-local venv (.venv/bin/skillspector,
// installed via `uv sync`) or falls back to a global install on PATH.
// Runs in static-only mode (--no-llm): no skill content leaves the machine.

import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

/**
 * Find a usable skillspector binary. Returns { command, label } or null.
 */
export function resolveInvocation(root) {
  const localBin = path.join(root, ".venv", "bin", "skillspector");
  if (fs.existsSync(localBin)) {
    return { command: localBin, label: "venv (uv sync)" };
  }
  if (spawnSync("which", ["skillspector"], { encoding: "utf8" }).status === 0) {
    return { command: "skillspector", label: "installed" };
  }
  return null;
}

/**
 * Run skillspector on an array of skill directories (relative to root).
 * Returns an array of { dir, score, severity, issueCount, error? }.
 */
export function runSkillspector(root, skillDirs) {
  const invocation = resolveInvocation(root);
  if (!invocation) return null;

  const results = [];
  for (const relDir of skillDirs.sort()) {
    const result = spawnSync(
      invocation.command,
      ["scan", relDir, "--no-llm", "--format", "json"],
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
      });
    } catch {
      results.push({ dir: relDir, error: "could not parse output" });
    }
  }
  return { label: invocation.label, results };
}

/**
 * List all skill directories under .agents/skills/ (category/skill-name).
 * Returns relative paths from root.
 */
export function listAllSkillDirs(root) {
  const skillsBase = path.join(root, ".agents/skills");
  if (!fs.existsSync(skillsBase)) return [];

  const dirs = [];
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
