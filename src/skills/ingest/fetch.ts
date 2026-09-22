import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readJson, writeJson, fail } from "../../core/commands.js";
import { validateManifest, sortedKeys } from "../inventory/manifest.js";
import { hashPath } from "../integrity/integrity.js";
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
  const stageDir = path.join(root, ".stage/skills");
  const stageLockPath = path.join(root, ".stage", "stage-lock.json");

  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agents-skills-"));
  fs.mkdirSync(path.join(root, ".stage"), { recursive: true });
  const tempStage = fs.mkdtempSync(path.join(root, ".stage/.fetch-tmp-"));
  const nextLock: Lock = { version: 1, sources: {}, skills: {} };
  let skillsCount = 0;

  try {
    for (const sourceName of sortedKeys(manifest.sources)) {
      const source = manifest.sources[sourceName];
      const cloneDir = path.join(tempRoot, "sources", safeName(sourceName));
      runGit("clone", ["--quiet", source.repository, cloneDir]);
      runGit("-C", [cloneDir, "checkout", "--quiet", source.ref]);
      const commit = runGit("-C", [cloneDir, "rev-parse", "HEAD"]).trim();

      const licenseFileName = `${safeName(sourceName)}-LICENSE`;
      const stagedLicense = path.join(tempStage, "licenses", licenseFileName);
      copyPath(path.join(cloneDir, source.license.path), stagedLicense, escapeGuard(cloneDir));

      nextLock.sources[sourceName] = {
        repository: source.repository,
        ref: source.ref,
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

        const relPath = skill.path.replace(/^skills\//, "");
        copySkillSource(cloneDir, skill.srcPath, path.join(tempStage, relPath));
        nextLock.skills[skillName] = {
          source: sourceName,
          srcPath: skill.srcPath,
          path: skill.path,
          commit,
          sha256: hashPath(path.join(tempStage, relPath)),
        };
        skillsCount++;
      }

      console.log(`${sourceName}: ${commit}`);
    }

    fs.rmSync(stageDir, { recursive: true, force: true });
    fs.renameSync(tempStage, stageDir);
    writeJson(stageLockPath, nextLock);
    console.log(`Fetched ${skillsCount} skills to stage.`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (fs.existsSync(tempStage)) {
      fs.rmSync(tempStage, { recursive: true, force: true });
    }
  }
}

// Upstream skill trees may contain symlinks (e.g. CLAUDE.md -> AGENTS.md).
// Dereference them so the vendored tree holds regular files only, but refuse
// links that resolve outside the clone so a hostile repo cannot pull local
// files into what we commit.
function escapeGuard(cloneDir: string): (src: string) => boolean {
  const root = fs.realpathSync(cloneDir);
  return (src) => {
    if (fs.lstatSync(src, { throwIfNoEntry: false })?.isSymbolicLink()) {
      let resolved: string;
      try {
        resolved = fs.realpathSync(src);
      } catch {
        fail(`dangling symlink in vendored source: ${src}`);
      }
      if (resolved !== root && !resolved.startsWith(`${root}${path.sep}`)) {
        fail(`symlink escapes vendored source: ${src} -> ${resolved}`);
      }
    }
    return true;
  };
}

function copyPath(source: string, target: string, filter?: (src: string) => boolean): void {
  if (!fs.existsSync(source)) fail(`missing path: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, preserveTimestamps: false, dereference: true, filter });
}

function copySkillSource(cloneDir: string, srcPath: string, target: string): void {
  const guard = escapeGuard(cloneDir);
  if (srcPath !== ".") {
    copyPath(path.join(cloneDir, srcPath), target, guard);
    return;
  }
  // Repo-root skill: copy everything except the clone's .git directory.
  const gitDir = path.join(cloneDir, ".git");
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(cloneDir, target, {
    recursive: true,
    preserveTimestamps: false,
    dereference: true,
    filter: (src) =>
      src !== gitDir && !src.startsWith(`${gitDir}${path.sep}`) && guard(src),
  });
}
