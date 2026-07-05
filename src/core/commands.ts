import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

export function run(command: string, args: string[], options?: { cwd?: string; maxBuffer?: number }): void {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: options?.maxBuffer ?? 1024 * 1024 * 64,
    cwd: options?.cwd,
  });
  if (result.status !== 0) {
    const msg = result.stderr?.trim() || `exit code ${result.status}`;
    console.error(`error: ${command} ${args.join(" ")} failed:\n${msg}`);
    process.exit(1);
  }
}

export function runCapture(command: string, args: string[], options?: { cwd?: string; maxBuffer?: number }): string {
  const result = spawnSync(command, args, {
    encoding: "utf8",
    maxBuffer: options?.maxBuffer ?? 1024 * 1024 * 64,
    cwd: options?.cwd,
  });
  if (result.status !== 0 && result.status !== null) {
    const msg = result.stderr?.trim() || result.error?.message || `exit code ${result.status}`;
    console.error(`error: ${command} ${args.join(" ")} failed:\n${msg}`);
    process.exit(1);
  }
  return result.stdout;
}

export function resolveExecutable(override: string | undefined, name: string, ...fallbacks: string[]): string | null {
  for (const candidate of [override, findOnPath(name), ...fallbacks]) {
    if (candidate && isExecutable(candidate)) return candidate;
  }
  return null;
}

export function findOnPath(name: string): string | null {
  for (const directory of (process.env.PATH || "").split(path.delimiter)) {
    if (!directory) continue;
    const candidate = path.join(directory, name);
    if (isExecutable(candidate)) return candidate;
  }
  return null;
}

export function isExecutable(file: string): boolean {
  try {
    fs.accessSync(file, fs.constants.X_OK);
    return true;
  } catch {
    return false;
  }
}

export function readJson<T = unknown>(file: string): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch (error: unknown) {
    console.error(`error: cannot read ${file}: ${(error as Error).message}`);
    process.exit(1);
  }
}

export function fail(message: string): never {
  console.error(`error: ${message}`);
  process.exit(1);
}

export function writeJson(file: string, value: unknown): void {
  fs.writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`);
}
