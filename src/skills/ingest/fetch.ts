import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { readJson, fail } from "../../core/commands.js";
import { validateManifest, sortedKeys } from "../inventory/manifest.js";
import type { Manifest } from "../inventory/manifest.js";

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

  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);

  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "agents-vendor-"));
  fs.mkdirSync(path.join(root, ".stage"), { recursive: true });
  const tempStage = fs.mkdtempSync(path.join(root, ".stage/.fetch-tmp-"));
  let skillsCount = 0;

  try {
    for (const sourceName of sortedKeys(manifest.sources)) {
      const source = manifest.sources[sourceName];
      const cloneDir = path.join(tempRoot, "sources", safeName(sourceName));
      runGit("clone", ["--quiet", source.repository, cloneDir]);
      runGit("-C", [cloneDir, "checkout", "--quiet", source.ref]);
      const commit = runGit("-C", [cloneDir, "rev-parse", "HEAD"]).trim();

      for (const skillName of sortedKeys(manifest.skills)) {
        const skill = manifest.skills[skillName];
        if (skill.source !== sourceName) continue;

        const upstream = path.join(cloneDir, skill.srcPath);
        if (!fs.existsSync(path.join(upstream, "SKILL.md"))) {
          fail(`missing SKILL.md at ${sourceName}:${skill.srcPath}`);
        }

        const relPath = skill.path.replace(/^skills\//, "");
        copyPath(upstream, path.join(tempStage, relPath));
        skillsCount++;
      }

      console.log(`${sourceName}: ${commit}`);
    }

    fs.rmSync(stageDir, { recursive: true, force: true });
    fs.renameSync(tempStage, stageDir);
    console.log(`Fetched ${skillsCount} skills to stage.`);
  } finally {
    fs.rmSync(tempRoot, { recursive: true, force: true });
    if (fs.existsSync(tempStage)) {
      fs.rmSync(tempStage, { recursive: true, force: true });
    }
  }
}

function copyPath(source: string, target: string): void {
  if (!fs.existsSync(source)) fail(`missing path: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, preserveTimestamps: false });
}
