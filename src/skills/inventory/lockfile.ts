import fs from "node:fs";
import path from "node:path";
import { readJson, fail } from "../../core/commands.js";
import type { Manifest } from "./manifest.js";
import { sortedKeys } from "./manifest.js";

export interface LockSource {
  repository: string;
  ref: string;
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

function assertKeysSubset(label: string, declared: Record<string, unknown>, locked: Record<string, unknown>): void {
  for (const key of sortedKeys(locked)) {
    if (declared[key] === undefined) {
      fail(`lock.json ${label} '${key}' is not declared in manifest.json; run \`make vendor\``);
    }
  }
}

export function validateSkillPath(skillPath: string, label: string): void {
  if (
    typeof skillPath !== "string" ||
    path.isAbsolute(skillPath) ||
    !skillPath.startsWith("skills/") ||
    path.posix.normalize(skillPath) !== skillPath ||
    skillPath.endsWith("/")
  ) {
    fail(`unsafe skill path in ${label}: ${skillPath}`);
  }
}

export function validateLicensePath(licensePath: string, label: string): void {
  if (
    typeof licensePath !== "string" ||
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

  // lock.json describes live accepted content only: it may be a subset of manifest.json
  // (skills can be declared without being live yet, e.g. never accepted, rejected, or
  // removed without being undeclared). Every key present in lock must still be declared.
  assertKeysSubset("source", currentManifest.sources, currentLock.sources);
  assertKeysSubset("skill", currentManifest.skills, currentLock.skills);

  for (const sourceName of sortedKeys(currentLock.sources)) {
    const declared = currentManifest.sources[sourceName];
    const locked = currentLock.sources[sourceName];
    if (
      locked.repository !== declared.repository ||
      locked.ref !== declared.ref ||
      locked.license !== declared.license.name ||
      !locked.licensePath ||
      !locked.licenseSha256
    ) {
      fail(`stale or incomplete lock source: ${sourceName}`);
    }
    validateLicensePath(locked.licensePath, `lock source ${sourceName}`);
  }

  for (const skillName of sortedKeys(currentLock.skills)) {
    const declared = currentManifest.skills[skillName];
    const locked = currentLock.skills[skillName];
    if (
      locked.source !== declared.source ||
      locked.srcPath !== declared.srcPath ||
      locked.path !== declared.path ||
      !locked.commit ||
      !locked.sha256
    ) {
      fail(`stale or incomplete lock skill: ${skillName}`);
    }
    validateSkillPath(locked.path, `lock skill ${skillName}`);
  }

  const referencedSources = new Set(Object.values(currentLock.skills).map((s) => s.source));
  for (const sourceName of sortedKeys(currentLock.sources)) {
    if (!referencedSources.has(sourceName)) {
      fail(`lock.json source '${sourceName}' has no referencing skill; run \`make vendor-accept\` or prune it`);
    }
  }

  // Every skill must reference a source that exists in the lock.
  // Without this check, license-path and license-hash verification is silently skipped
  // for skills whose source record is absent, and the lock appears healthy when it is not.
  for (const [skillName, skill] of Object.entries(currentLock.skills)) {
    if (!currentLock.sources[skill.source]) {
      fail(`lock.json skill '${skillName}' references missing source '${skill.source}'`);
    }
  }
}

export function validateStageLock(raw: unknown): asserts raw is Lock {
  if (!checkLockShape(raw)) {
    fail("Malformed stage-lock.json: top-level shape (version/sources/skills) is invalid");
  }
  const stageLock = raw as Lock;
  for (const [sourceName, source] of Object.entries(stageLock.sources)) {
    if (
      !isObject(source) ||
      typeof source.repository !== "string" ||
      !source.repository ||
      typeof source.ref !== "string" ||
      !source.ref ||
      typeof source.license !== "string" ||
      !source.license ||
      typeof source.licensePath !== "string" ||
      !source.licensePath ||
      typeof source.licenseSha256 !== "string" ||
      !source.licenseSha256
    ) {
      fail(`Malformed stage-lock.json: source '${sourceName}' is missing required fields`);
    }
    validateLicensePath(source.licensePath, `stage-lock source ${sourceName}`);
  }
  for (const [skillName, skill] of Object.entries(stageLock.skills)) {
    if (
      !isObject(skill) ||
      typeof skill.source !== "string" ||
      !skill.source ||
      typeof skill.srcPath !== "string" ||
      !skill.srcPath ||
      typeof skill.path !== "string" ||
      !skill.path ||
      typeof skill.commit !== "string" ||
      !skill.commit ||
      typeof skill.sha256 !== "string" ||
      !skill.sha256
    ) {
      fail(`Malformed stage-lock.json: skill '${skillName}' is missing required fields`);
    }
    validateSkillPath(skill.path, `stage-lock skill ${skillName}`);
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
