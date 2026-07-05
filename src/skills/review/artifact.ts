import fs from "node:fs";
import path from "node:path";
import type { Finding } from "../types.js";
import type { SkillspectorOutput, SkillspectorScanResult } from "./skillspector.js";

export type ArtifactKind = "skills-review" | "skills-audit" | "skills-accept";

export interface ArtifactFinding {
  file: string;
  label: string;
  snippet: string;
  line?: number;
  fingerprint: string;
}

export interface ArtifactSkillspector {
  label: string;
  results: SkillspectorScanResult[];
}

export interface ArtifactSummary {
  total: number;
  bySkill: Record<string, number>;
}

export interface Artifact {
  kind: ArtifactKind;
  timestamp: string;
  command: string;
  skills: string[];
  findings: ArtifactFinding[];
  scanners: string[];
  changedFiles?: string[];
  skillspector?: ArtifactSkillspector;
  summary: ArtifactSummary;
}

function skillFromPath(filePath: string): string {
  const parts = filePath.replace(/^\.agents\/skills\//, "").split("/");
  return parts.slice(0, 2).join("/");
}

function computeBySkill(findings: Finding[]): Record<string, number> {
  const bySkill: Record<string, number> = {};
  for (const f of findings) {
    const skill = skillFromPath(f.file);
    bySkill[skill] = (bySkill[skill] ?? 0) + 1;
  }
  return bySkill;
}

function toArtifactFindings(findings: Finding[]): ArtifactFinding[] {
  return findings.map((f) => ({
    file: f.file,
    label: f.label,
    snippet: f.snippet,
    line: f.lineNum,
    fingerprint: f.fingerprint,
  }));
}

function artifactPath(root: string, kind: ArtifactKind, timestamp: string): string {
  const safe = timestamp.replace(/[:.]/g, "-");
  const dir = path.join(root, "reports", "security", kind);
  fs.mkdirSync(dir, { recursive: true });
  return path.join(dir, `${kind}-${safe}.json`);
}

export function writeArtifact(
  root: string,
  kind: ArtifactKind,
  command: string,
  skills: string[],
  findings: Finding[],
  scanners: string[],
  changedFiles?: string[],
  skillspector?: SkillspectorOutput | null,
): string {
  const timestamp = new Date().toISOString();
  const artifact: Artifact = {
    kind,
    timestamp,
    command,
    skills,
    findings: toArtifactFindings(findings),
    scanners,
    changedFiles,
    skillspector: skillspector
      ? { label: skillspector.label, results: skillspector.results }
      : undefined,
    summary: {
      total: findings.length,
      bySkill: computeBySkill(findings),
    },
  };

  const filePath = artifactPath(root, kind, timestamp);
  fs.writeFileSync(filePath, JSON.stringify(artifact, null, 2) + "\n");
  return filePath;
}
