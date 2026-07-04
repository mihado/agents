// Shared scanning utilities for vendor-review and vendor-audit.

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { INJECTION_PATTERNS, CODE_RISK_PATTERNS, PROSE_EXTS, CODE_EXTS } from "./patterns.js";

/**
 * Return the applicable patterns for a given file extension.
 */
export function patternsForExt(ext) {
  if (PROSE_EXTS.has(ext)) return INJECTION_PATTERNS;
  if (CODE_EXTS.has(ext)) return [...INJECTION_PATTERNS, ...CODE_RISK_PATTERNS];
  return [];
}

/**
 * Scan an array of lines, returning findings.
 * Each finding: { label, snippet, lineNum }
 */
export function scanLines(lines, ext) {
  const patterns = patternsForExt(ext);
  if (patterns.length === 0) return [];

  const findings = [];
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

/**
 * Scan a single file on disk. Returns findings with file path attached.
 * relFile: relative file path (used in output and fingerprinting).
 */
export function scanFile(absFile, relFile) {
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

/**
 * Deterministic fingerprint for a finding (stable across runs).
 */
export function fingerprint(file, label, snippet) {
  return crypto
    .createHash("sha256")
    .update(`${file}\0${label}\0${snippet}`)
    .digest("hex")
    .slice(0, 16);
}

/**
 * Recursively walk a directory, returning absolute file paths.
 */
export function walk(dir) {
  const results = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) results.push(...walk(full));
    else results.push(full);
  }
  return results;
}
