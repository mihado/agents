import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { INJECTION_PATTERNS, PROSE_EXTS } from "./findings.js";
import type { Finding } from "../types.js";

export function patternsForExt(ext: string): [RegExp, string][] {
  if (PROSE_EXTS.has(ext)) return INJECTION_PATTERNS;
  return [];
}

export function scanLines(lines: string[], ext: string): { label: string; snippet: string; lineNum: number }[] {
  const patterns = patternsForExt(ext);
  if (patterns.length === 0) return [];
  const findings: { label: string; snippet: string; lineNum: number }[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    for (const [pattern, label] of patterns) {
      if (pattern.test(line)) {
        findings.push({ label, snippet: line.trim().slice(0, 160), lineNum: i + 1 });
      }
    }
  }
  return findings;
}

export function scanFile(absFile: string, relFile: string): Finding[] {
  const ext = path.extname(absFile).toLowerCase();
  const patterns = patternsForExt(ext);
  if (patterns.length === 0) return [];
  const content = fs.readFileSync(absFile, "utf8");
  const lines = content.split("\n");
  return scanLines(lines, ext).map((f) => ({
    file: relFile,
    label: f.label,
    snippet: f.snippet,
    lineNum: f.lineNum,
    fingerprint: fingerprint(relFile, f.label, f.snippet),
  }));
}

export function fingerprint(file: string, label: string, snippet: string): string {
  return crypto
    .createHash("sha256")
    .update(`${file}\0${label}\0${snippet}`)
    .digest("hex")
    .slice(0, 16);
}

export function walk(dir: string): string[] {
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}
