import fs from "node:fs";
import path from "node:path";
import { readJson, writeJson, fail } from "../../core/commands.js";
import { validateManifest, sortedKeys } from "../inventory/manifest.js";
import type { Manifest } from "../inventory/manifest.js";
import type { Lock, LockSkill, LockSource } from "../inventory/lockfile.js";
import { validateSkillPath, validateLicensePath, validateStageLock, validateLock } from "../inventory/lockfile.js";

export function promoteStagedContent(root: string): Lock {
  const manifestPath = path.join(root, "config", "skills", "manifest.json");
  const lockPath = path.join(root, "config", "skills", "lock.json");
  const stageLockPath = path.join(root, ".stage", "stage-lock.json");
  const stageDir = path.join(root, ".stage/skills");

  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);

  if (!fs.existsSync(stageLockPath)) {
    fail("No stage-lock.json found. Run `apm skills fetch` first.");
  }
  const stageLock = readJson<Lock>(stageLockPath);
  validateStageLock(stageLock);

  const previousLock = fs.existsSync(lockPath) ? readJson<Lock>(lockPath) : null;

  // A skill declared in the manifest but absent from stage was rejected this round
  // (or never fetched). Its previously accepted live revision, if any, is preserved
  // as-is: reject only removes a candidate from stage, it never touches live content.
  const liveSkills: Record<string, LockSkill> = { ...stageLock.skills };
  if (previousLock?.skills) {
    for (const [skillName, skill] of Object.entries(previousLock.skills)) {
      if (liveSkills[skillName] === undefined && manifest.skills[skillName] !== undefined) {
        liveSkills[skillName] = skill;
      }
    }
  }

  // lock.json describes live accepted content only: a source stays in lock exactly
  // as long as some live skill still references it, independent of manifest declaration.
  const referencedSources = new Set(Object.values(liveSkills).map((skill) => skill.source));
  const liveSources: Record<string, LockSource> = {};
  for (const sourceName of referencedSources) {
    const source = stageLock.sources[sourceName] ?? previousLock?.sources[sourceName];
    if (source) liveSources[sourceName] = source;
  }

  const liveLock: Lock = { version: 1, skills: liveSkills, sources: liveSources };

  // Validate the computed live lock against the manifest before mutating any file on disk.
  // If this fails, the previous live tree and lock remain intact and the caller must investigate.
  validateLock(manifest, liveLock);

  if (previousLock?.skills) {
    for (const [skillName, skill] of Object.entries(previousLock.skills)) {
      if (liveSkills[skillName] === undefined) {
        validateSkillPath(skill.path, `previous lock skill ${skillName}`);
        fs.rmSync(path.join(root, ".agents", skill.path), { recursive: true, force: true });
      }
    }
  }

  if (previousLock?.sources) {
    for (const [sourceName, source] of Object.entries(previousLock.sources)) {
      if (liveSources[sourceName] === undefined && source.licensePath) {
        validateLicensePath(source.licensePath, `previous lock source ${sourceName}`);
        fs.rmSync(path.join(root, source.licensePath), { force: true });
      }
    }
  }

  for (const skillName of sortedKeys(stageLock.skills)) {
    const skill = stageLock.skills[skillName];
    validateSkillPath(skill.path, `stage lock skill ${skillName}`);

    // Remove stale live directory if the skill's path changed since the last accept cycle.
    if (previousLock?.skills?.[skillName] && previousLock.skills[skillName].path !== skill.path) {
      const oldPath = previousLock.skills[skillName].path;
      validateSkillPath(oldPath, `previous lock skill ${skillName} (changed path)`);
      const oldLivePath = path.join(root, ".agents", oldPath);
      if (fs.existsSync(oldLivePath)) {
        fs.rmSync(oldLivePath, { recursive: true, force: true });
      }
    }

    const stagePath = path.join(stageDir, skill.path.replace(/^skills\//, ""));
    const livePath = path.join(root, ".agents", skill.path);
    if (fs.existsSync(livePath)) {
      fs.rmSync(livePath, { recursive: true, force: true });
    }
    fs.mkdirSync(path.dirname(livePath), { recursive: true });
    fs.cpSync(stagePath, livePath, { recursive: true, preserveTimestamps: false });
  }

  for (const sourceName of sortedKeys(stageLock.sources)) {
    if (liveSources[sourceName] === undefined) continue;
    const source = stageLock.sources[sourceName];
    validateLicensePath(source.licensePath, `stage lock source ${sourceName}`);
    const stageLicense = path.join(stageDir, "licenses", path.basename(source.licensePath));
    const liveLicense = path.join(root, source.licensePath);
    fs.mkdirSync(path.dirname(liveLicense), { recursive: true });
    fs.cpSync(stageLicense, liveLicense, { force: true });
  }

  writeJson(lockPath, liveLock);
  fs.rmSync(stageDir, { recursive: true, force: true });
  fs.rmSync(stageLockPath, { force: true });
  return liveLock;
}
