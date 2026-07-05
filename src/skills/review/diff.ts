import path from "node:path";
import { scanLines, fingerprint } from "./prose-scanner.js";
import { CODE_EXTS } from "./findings.js";
import type { Finding } from "../types.js";

export interface DiffChanges {
  changedFiles: Map<string, Set<number>>;
  findings: Finding[];
}

export function parseDiff(diffOutput: string): DiffChanges {
  const findings: Finding[] = [];
  const changedFiles = new Map<string, Set<number>>();
  let currentFile = "";
  let currentExt = "";
  let nextLineNum = 0;

  for (const line of diffOutput.split("\n")) {
    const fileMatch = line.match(/^\+\+\+ b\/(.+)$/);
    if (fileMatch) {
      currentFile = fileMatch[1];
      currentExt = path.extname(currentFile).toLowerCase();
      nextLineNum = 0;
      if (CODE_EXTS.has(currentExt) && !changedFiles.has(currentFile)) {
        changedFiles.set(currentFile, new Set());
      }
      continue;
    }

    const hunkMatch = line.match(/^@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
    if (hunkMatch) {
      nextLineNum = Number(hunkMatch[1]);
      continue;
    }
    if (!currentFile) continue;
    const codeExt = currentExt && CODE_EXTS.has(currentExt);

    if (line.startsWith("+") && !line.startsWith("+++")) {
      const added = line.slice(1);

      if (codeExt) {
        changedFiles.get(currentFile)?.add(nextLineNum);
      } else {
        const lineFindings = scanLines([added], currentExt);
        for (const f of lineFindings) {
          findings.push({
            file: currentFile,
            label: f.label,
            snippet: f.snippet,
            fingerprint: fingerprint(currentFile, f.label, f.snippet),
          });
        }
      }

      nextLineNum += 1;
      continue;
    }

    if (line.startsWith("-") && !line.startsWith("---")) {
      continue;
    }

    if (nextLineNum > 0) {
      nextLineNum += 1;
    }
  }

  return { changedFiles, findings };
}
