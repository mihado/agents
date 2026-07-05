import fs from "node:fs";
import path from "node:path";
import { readJson, fail } from "../../core/commands.js";
import type { Manifest } from "./manifest.js";
import { sortedKeys } from "./manifest.js";

export interface LockSource {
  repository: string;
  ref: string;
  commit: string;
  license: string;
  licensePath: string;
  licenseSha256: string;
}

export interface LockSkill {
  source: string;
  srcPath: string;
  path: string;
  commit: string;
  sha256: string;
}

export interface Lock {
  version: number;
  sources: Record<string, LockSource>;
  skills: Record<string, LockSkill>;
}

function assertSameKeys(label: string, declared: Record<string, unknown>, locked: Record<string, unknown>): void {
  const declaredKeys = sortedKeys(declared);
  const lockedKeys = sortedKeys(locked);
  if (JSON.stringify(declaredKeys) !== JSON.stringify(lockedKeys)) {
    fail(`${label} differ between manifest.json and lock.json; run \`make vendor\``);
  }
}

function validateLicensePath(licensePath: string, label: string): void {
  if (
    path.isAbsolute(licensePath) ||
    !licensePath.startsWith(".agents/licenses/") ||
    path.posix.normalize(licensePath) !== licensePath
  ) {
    fail(`unsafe license path in ${label}: ${licensePath}`);
  }
}

export function validateLock(currentManifest: Manifest, raw: unknown): asserts raw is Lock {
  const currentLock = raw as Lock;
  if (currentLock.version !== 1) fail("lock.json version must be 1");
  if (!isObject(currentLock.sources) || !isObject(currentLock.skills)) {
    fail("lock.json must contain sources and skills objects");
  }

  assertSameKeys("sources", currentManifest.sources, currentLock.sources);
  assertSameKeys("skills", currentManifest.skills, currentLock.skills);

  for (const sourceName of sortedKeys(currentManifest.sources)) {
    const declared = currentManifest.sources[sourceName];
    const locked = currentLock.sources[sourceName];
    if (
      locked.repository !== declared.repository ||
      locked.ref !== declared.ref ||
      locked.license !== declared.license.name ||
      !locked.commit ||
      !locked.licensePath ||
      !locked.licenseSha256
    ) {
      fail(`stale or incomplete lock source: ${sourceName}`);
    }
    validateLicensePath(locked.licensePath, `lock source ${sourceName}`);
  }

  for (const skillName of sortedKeys(currentManifest.skills)) {
    const declared = currentManifest.skills[skillName];
    const locked = currentLock.skills[skillName];
    const source = currentLock.sources[declared.source];
    if (
      locked.source !== declared.source ||
      locked.srcPath !== declared.srcPath ||
      locked.path !== declared.path ||
      locked.commit !== source.commit ||
      !locked.sha256
    ) {
      fail(`stale or incomplete lock skill: ${skillName}`);
    }
  }
}

export function readLock(root: string): Lock {
  const lockPath = path.join(root, "config", "skills", "lock.json");
  return readJson<Lock>(lockPath);
}

export function checkLockFile(root: string): boolean {
  const lockPath = path.join(root, "config", "skills", "lock.json");
  if (!fs.existsSync(lockPath)) return false;
  try {
    return checkLockShape(readJson<Record<string, unknown>>(lockPath));
  } catch {
    return false;
  }
}

export function checkLockShape(raw: unknown): boolean {
  const lock = raw as Lock;
  return lock.version === 1 && isObject(lock.sources) && isObject(lock.skills);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
