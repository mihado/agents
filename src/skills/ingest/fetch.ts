import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readJson, writeJson, fail } from "../../core/commands.js";
import { validateManifest, sortedKeys } from "../inventory/manifest.js";
import { validateLock } from "../inventory/lockfile.js";
import { hashPath, verifyWorkingCopy } from "../integrity/integrity.js";
import { applyFetchedContent } from "./apply.js";
import type { Manifest } from "../inventory/manifest.js";
import type { Lock } from "../inventory/lockfile.js";

function runGit(command: string, args: string[]): string {
  const result = spawnSync("git", [command, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    fail(`git ${command} ${args.join(" ")} failed:\n${result.stderr.trim()}`);
  }
  return result.stdout;
}

function safeName(value: string): string {
  return value.replace(/[^a-zA-Z0-9._-]+/g, "-");
}

export function fetchSkills(root: string): void {
  const manifestPath = path.join(root, "config", "skills", "manifest.json");
  const lockPath = path.join(root, "config", "skills", "lock.json");
  const skillsRoot = path.join(root, ".agents/skills");
  const licensesRoot = path.join(root, ".agents/licenses");

  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);

  const previousLock: Lock | null = fs.existsSync(lockPath) ? readJson<Lock>(lockPath) : null;
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agents-vendor-"));
  const nextLock: Lock = { version: 1, sources: {}, skills: {} };

  try {
    for (const sourceName of sortedKeys(manifest.sources)) {
      const source = manifest.sources[sourceName];
      const cloneDir = path.join(tempRoot, "sources", safeName(sourceName));
      runGit("clone", ["--quiet", source.repository, cloneDir]);
      runGit("-C", [cloneDir, "checkout", "--quiet", source.ref]);
      const commit = runGit("-C", [cloneDir, "rev-parse", "HEAD"]).trim();

      const licenseFileName = `${safeName(sourceName)}-LICENSE`;
      const stagedLicense = path.join(tempRoot, "licenses", licenseFileName);
      copyPath(path.join(cloneDir, source.license.path), stagedLicense);

      nextLock.sources[sourceName] = {
        repository: source.repository,
        ref: source.ref,
        commit,
        license: source.license.name,
        licensePath: `.agents/licenses/${licenseFileName}`,
        licenseSha256: hashPath(stagedLicense),
      };

      for (const skillName of sortedKeys(manifest.skills)) {
        const skill = manifest.skills[skillName];
        if (skill.source !== sourceName) continue;

        const upstream = path.join(cloneDir, skill.srcPath);
        if (!fs.existsSync(path.join(upstream, "SKILL.md"))) {
          fail(`missing SKILL.md at ${sourceName}:${skill.srcPath}`);
        }

        const stagedSkill = path.join(tempRoot, "skills", skillName);
        copyPath(upstream, stagedSkill);
        nextLock.skills[skillName] = {
          source: sourceName,
          srcPath: skill.srcPath,
          path: skill.path,
          commit,
          sha256: hashPath(stagedSkill),
        };
      }

      console.log(`${sourceName}: ${commit}`);
    }

    applyFetchedContent(root, previousLock, nextLock, tempRoot, skillsRoot, licensesRoot);
    writeJson(lockPath, nextLock);
    validateLock(manifest, nextLock);
    verifyWorkingCopy(root, nextLock);
    console.log("Vendor fetch complete.");
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
  }
}

function copyPath(source: string, target: string): void {
  if (!fs.existsSync(source)) fail(`missing path: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, preserveTimestamps: false });
}
