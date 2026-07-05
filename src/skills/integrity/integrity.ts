import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fail } from "../../core/commands.js";
import type { Lock } from "../inventory/lockfile.js";

export function hashPath(target: string): string {
  const hash = crypto.createHash("sha256");
  const stat = fs.statSync(target);

  if (stat.isFile()) {
    hash.update(path.basename(target));
    hash.update("\0");
    hash.update(fs.readFileSync(target));
    return hash.digest("hex");
  }

  for (const file of walkFiles(target)) {
    const relative = path.relative(target, file).split(path.sep).join("/");
    hash.update(relative);
    hash.update("\0");
    hash.update(fs.readFileSync(file));
    hash.update("\0");
  }

  return hash.digest("hex");
}

function walkFiles(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...walkFiles(entryPath));
    else if (entry.isFile()) files.push(entryPath);
    else fail(`unsupported vendored entry: ${entryPath}`);
  }
  return files.sort();
}

function verifyHash(target: string, expected: string, label: string): void {
  if (!fs.existsSync(target)) fail(`missing ${label}: ${target}`);
  const actual = hashPath(target);
  if (actual !== expected) {
    fail(`${label} was modified (expected ${expected}, got ${actual})`);
  }
}

export function verifyWorkingCopy(root: string, currentLock: Lock): void {
  for (const [skillName, skill] of Object.entries(currentLock.skills)) {
    const local = path.join(root, ".agents", skill.path);
    if (!fs.existsSync(path.join(local, "SKILL.md"))) {
      fail(`missing vendored skill: ${skillName}`);
    }
    verifyHash(local, skill.sha256, `skill ${skillName}`);
  }

  for (const [sourceName, source] of Object.entries(currentLock.sources)) {
    verifyHash(path.join(root, source.licensePath), source.licenseSha256, `license ${sourceName}`);
  }
}


