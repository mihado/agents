import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fingerprint } from "./prose-scanner.js";
import type { Finding } from "../types.js";

export interface SemgrepInvocation {
  command: string;
  label: string;
}

const ACCEPTED_EXIT_CODES = new Set([0, 1]);

export function resolveSemgrepInvocation(root: string): SemgrepInvocation | null {
  const localBin = path.join(root, ".venv", "bin", "semgrep");
  if (fs.existsSync(localBin)) {
    return { command: localBin, label: "venv (uv sync)" };
  }
  if (spawnSync("which", ["semgrep"], { encoding: "utf8" }).status === 0) {
    return { command: "semgrep", label: "installed" };
  }
  return null;
}

export function defaultSemgrepConfig(root: string): string {
  return path.join(root, "config", "skills", "semgrep.yml");
}

export function scanCodeFiles(root: string, relFiles: string[], configPath?: string): Finding[] {
  if (relFiles.length === 0) return [];

  const invocation = resolveSemgrepInvocation(root);
  if (!invocation) {
    throw new Error("semgrep not available. Run `make setup` to install.");
  }

  const config = configPath ?? defaultSemgrepConfig(root);
  const result = spawnSync(
    invocation.command,
    ["scan", "--config", config, "--json", ...relFiles],
    { cwd: root, encoding: "utf8", maxBuffer: 1024 * 1024 * 64 },
  );

  if (!ACCEPTED_EXIT_CODES.has(result.status ?? 2) || result.error) {
    throw new Error(result.stderr?.trim() || result.error?.message || "semgrep scan failed");
  }

  return normalizeSemgrepResults(root, JSON.parse(result.stdout || "{}"));
}

interface SemgrepResult {
  check_id?: string;
  path: string;
  start?: { line?: number };
  extra?: {
    message?: string;
    lines?: string;
  };
}

interface SemgrepOutput {
  results?: SemgrepResult[];
}

export function normalizeSemgrepResults(root: string, parsed: SemgrepOutput): Finding[] {
  return (parsed.results || []).map((result) => {
    const file = path.isAbsolute(result.path)
      ? path.relative(root, result.path)
      : result.path;
    const lbl = labelForResult(result);
    const snip = snippetForResult(root, file, result);
    return {
      file,
      label: lbl,
      snippet: snip,
      lineNum: result.start?.line || 1,
      fingerprint: fingerprint(file, lbl, snip),
    };
  });
}

function labelForResult(result: SemgrepResult): string {
  const message = result.extra?.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim();
  }
  return String(result.check_id || "semgrep");
}

function snippetForResult(root: string, file: string, result: SemgrepResult): string {
  const sourceSnippet = readSourceLine(root, file, result.start?.line || 1);
  if (sourceSnippet) return sourceSnippet;

  const lines = result.extra?.lines;
  if (typeof lines === "string" && lines.trim() && lines.trim() !== "requires login") {
    return lines.trim().replace(/\s+/g, " ").slice(0, 160);
  }

  const message = result.extra?.message;
  if (typeof message === "string" && message.trim()) {
    return message.trim().slice(0, 160);
  }

  return String(result.check_id || "semgrep");
}

function readSourceLine(root: string, file: string, lineNum: number): string | null {
  const absPath = path.join(root, file);
  if (!fs.existsSync(absPath)) return null;

  const line = fs.readFileSync(absPath, "utf8").split("\n")[lineNum - 1];
  if (!line) return null;
  return line.trim().slice(0, 160);
}
