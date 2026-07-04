// Baseline I/O for vendor-review.
//
// The baseline file (.vendor-review-baseline.json) stores fingerprints of
// findings that have been reviewed and accepted. On subsequent scans, any
// finding whose fingerprint appears in the baseline is suppressed.

import fs from "node:fs";

/**
 * Read the baseline file. Returns an array of accepted entries.
 */
export function readBaseline(baselinePath) {
  if (!fs.existsSync(baselinePath)) return [];
  try {
    const parsed = JSON.parse(fs.readFileSync(baselinePath, "utf8"));
    return Array.isArray(parsed.accepted) ? parsed.accepted : [];
  } catch (error) {
    throw new Error(`cannot read ${baselinePath}: ${error.message}`);
  }
}

/**
 * Write the baseline file (sorted by fingerprint for stable diffs).
 */
export function writeBaseline(baselinePath, entries) {
  const sorted = [...entries].sort((a, b) => a.fingerprint.localeCompare(b.fingerprint));
  fs.writeFileSync(baselinePath, `${JSON.stringify({ accepted: sorted }, null, 2)}\n`);
}

/**
 * Merge new findings into an existing baseline (deduplicates by fingerprint).
 * Returns the merged array.
 */
export function mergeBaseline(existing, newFindings) {
  const byFingerprint = new Map(existing.map((entry) => [entry.fingerprint, entry]));
  for (const { file, label, snippet, fingerprint } of newFindings) {
    if (!byFingerprint.has(fingerprint)) {
      byFingerprint.set(fingerprint, {
        fingerprint,
        file,
        label,
        snippet,
        acceptedAt: new Date().toISOString().slice(0, 10),
      });
    }
  }
  return [...byFingerprint.values()];
}
