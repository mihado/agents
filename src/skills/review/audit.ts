import path from "node:path";
import { scanFile, walk } from "./prose-scanner.js";
import { readBaseline, writeBaseline, mergeBaseline } from "./baseline.js";
import { CODE_EXTS } from "./findings.js";
import { scanCodeFiles } from "./semgrep.js";
import { listAllSkillDirs, runSkillspector, runSkillspectorWithProgress, generateBaseline } from "./skillspector.js";
import { writeArtifact } from "./artifact.js";
import type { Finding } from "../types.js";
import type { SkillspectorOutput } from "./skillspector.js";

export interface AuditOptions {
  root: string;
  jsonOutput?: boolean;
  accept?: boolean;
  withSkillspector?: boolean;
}

export interface AuditResult {
  findings: Finding[];
  skillspector: SkillspectorOutput | null;
}

export function runVendorAudit(opts: AuditOptions): AuditResult {
  const { root, jsonOutput, accept, withSkillspector } = opts;
  const baselinePath = path.join(root, "config", "skills", "vendor-review-baseline.json");
  const skillspectorBaselinePath = path.join(root, "config", "skills", "skillspector-baseline.yaml");
  const skillsDir = path.join(root, ".agents/skills");

  const files = walk(skillsDir);
  const findings: Finding[] = [];
  const codeFiles: string[] = [];

  for (const absFile of files) {
    const relFile = path.relative(root, absFile);
    const ext = path.extname(absFile).toLowerCase();
    if (CODE_EXTS.has(ext)) {
      codeFiles.push(relFile);
      continue;
    }
    findings.push(...scanFile(absFile, relFile));
  }

  findings.push(...scanCodeFiles(root, codeFiles));

  if (accept) {
    writeArtifact(root, "vendor-audit", "vendor-audit --accept", auditSkillNames(findings), findings, ["prose-scanner", "semgrep"]);
    const baseline = readBaseline(baselinePath);
    writeBaseline(baselinePath, mergeBaseline(baseline, findings));
    console.log(`Accepted ${findings.length} finding(s) into ${path.relative(root, baselinePath)}.`);

    console.log("Generating skillspector baseline (static-only, may take a minute)...");
    const result = generateBaseline(root, ".agents/skills", skillspectorBaselinePath);
    if (result !== true) {
      console.error(result);
      process.exit(1);
    }
    process.exit(0);
  }

  if (jsonOutput) {
    const auditScanners = withSkillspector ? ["prose-scanner", "semgrep", "skillspector"] : ["prose-scanner", "semgrep"];
    writeArtifact(root, "vendor-audit", "vendor-audit --json", auditSkillNames(findings), findings, auditScanners);
    const output: Record<string, unknown> = { findings, count: findings.length };
    if (withSkillspector) {
      const skillDirs = listAllSkillDirs(root);
      output.skillspector = runSkillspector(root, skillDirs);
    }
    console.log(JSON.stringify(output, null, 2));
    process.exit(0);
  }

  if (findings.length === 0) {
    console.log("No suspicious patterns found in live skill tree.");
  } else {
    console.log(`${findings.length} finding(s):\n`);
    for (const { file, label, snippet } of findings) {
      console.log(`${file}\n  [${label}] ${snippet}\n`);
    }

    const bySkill: Record<string, Finding[]> = {};
    for (const f of findings) {
      const parts = f.file.replace(/^\.agents\/skills\//, "").split("/");
      const skillName = parts.slice(0, 2).join("/");
      bySkill[skillName] = bySkill[skillName] || [];
      bySkill[skillName].push(f);
    }

    console.log("--- By skill ---\n");
    for (const [skill, items] of Object.entries(bySkill).sort(
      (a, b) => b[1].length - a[1].length,
    )) {
      const labels = [...new Set(items.map((i) => i.label))];
      console.log(`  ${skill.padEnd(40)} ${items.length} finding(s) [${labels.join(", ")}]`);
    }
  }

  let skillspectorResult: SkillspectorOutput | null = null;

  if (withSkillspector) {
    skillspectorResult = runSkillspectorWithProgress(root, listAllSkillDirs(root), "live", skillspectorBaselinePath);
  }

  const auditScanners = withSkillspector ? ["prose-scanner", "semgrep", "skillspector"] : ["prose-scanner", "semgrep"];
  writeArtifact(root, "vendor-audit", "vendor-audit", auditSkillNames(findings), findings, auditScanners, undefined, skillspectorResult);

  return { findings, skillspector: skillspectorResult };
}

function auditSkillNames(findings: Finding[]): string[] {
  const names = new Set<string>();
  for (const f of findings) {
    const parts = f.file.replace(/^\.agents\/skills\//, "").split("/");
    if (parts.length >= 2) names.add(parts.slice(0, 2).join("/"));
  }
  return [...names].sort();
}
