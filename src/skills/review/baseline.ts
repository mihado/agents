import fs from "node:fs";
import type { Baseline, Finding } from "../types.js";

export function readBaseline(baselinePath: string): Baseline {
  if (!fs.existsSync(baselinePath)) return { rules: [], fingerprints: [] };
  try {
    const parsed = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    if (Array.isArray(parsed.accepted)) {
      return {
        rules: [],
        fingerprints: parsed.accepted.map((e: Record<string, unknown>) => ({
          hash: e.fingerprint as string,
          rule_id: e.label as string,
          file: e.file as string,
          reason: `Accepted ${(e.acceptedAt as string) || "unknown date"}`,
        })),
      };
    }
    return {
      rules: Array.isArray(parsed.rules) ? parsed.rules : [],
      fingerprints: Array.isArray(parsed.fingerprints) ? parsed.fingerprints : [],
    };
  } catch (error: unknown) {
    throw new Error(`cannot read ${baselinePath}: ${(error as Error).message}`, { cause: error });
  }
}

export function writeBaseline(baselinePath: string, { rules, fingerprints }: Baseline): void {
  const sorted = [...fingerprints].sort((a, b) => a.hash.localeCompare(b.hash));
  const data = { version: 1, rules: rules || [], fingerprints: sorted };
  fs.writeFileSync(baselinePath, `${JSON.stringify(data, null, 2)}\n`);
}

export function mergeBaseline(
  { rules, fingerprints }: Baseline,
  newFindings: Finding[],
  reason?: string,
): Baseline {
  const byHash = new Map(fingerprints.map((entry) => [entry.hash, entry]));
  const acceptReason = reason || `Accepted ${new Date().toISOString().slice(0, 10)}`;

  for (const { file, label, fingerprint: fp } of newFindings) {
    if (fp && !byHash.has(fp)) {
      byHash.set(fp, { hash: fp, rule_id: label, file, reason: acceptReason });
    }
  }
  return { rules: rules || [], fingerprints: [...byHash.values()] };
}

export function isSuppressed({ rules, fingerprints }: Baseline, finding: Finding): boolean {
  const hashes = new Set(fingerprints.map((f) => f.hash));
  if (finding.fingerprint && hashes.has(finding.fingerprint)) return true;

  for (const rule of rules) {
    if (rule.rule_id && rule.rule_id !== finding.label) continue;
    if (rule.file_glob) {
      const pattern = rule.file_glob.replace(/\*/g, ".*");
      if (new RegExp(`^${pattern}$`).test(finding.file)) return true;
    } else {
      if (rule.rule_id === finding.label) return true;
    }
  }
  return false;
}
