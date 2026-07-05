import fs from "node:fs";
import path from "node:path";
import { fail } from "../../core/commands.js";
import { validateLocalPath, validateLicensePath } from "../inventory/paths.js";
import type { Lock } from "../inventory/lockfile.js";
import { sortedKeys } from "../inventory/manifest.js";

export function copyPath(source: string, target: string): void {
  if (!fs.existsSync(source)) fail(`missing path: ${source}`);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.cpSync(source, target, { recursive: true, preserveTimestamps: false });
}

function replacePath(source: string, target: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.rmSync(target, { recursive: true, force: true });
  fs.cpSync(source, target, { recursive: true, preserveTimestamps: false });
}

export function applyFetchedContent(
  root: string,
  previousLock: Lock | null,
  nextLock: Lock,
  tempRoot: string,
  skillsRoot: string,
  licensesRoot: string,
): void {
  fs.mkdirSync(skillsRoot, { recursive: true });
  fs.mkdirSync(licensesRoot, { recursive: true });

  if (previousLock?.skills) {
    for (const [skillName, skill] of Object.entries(previousLock.skills)) {
      const previousPath = skill.path || `skills/${skillName}`;
      if (!nextLock.skills[skillName] || nextLock.skills[skillName].path !== previousPath) {
        validateLocalPath(previousPath, skillName);
        fs.rmSync(path.join(root, ".agents", previousPath), { recursive: true, force: true });
      }
    }
  }

  if (previousLock?.sources) {
    for (const source of Object.values(previousLock.sources)) {
      if (source.licensePath && !Object.values(nextLock.sources).some((next) => next.licensePath === source.licensePath)) {
        validateLicensePath(source.licensePath, "previous lock");
        fs.rmSync(path.join(root, source.licensePath), { force: true });
      }
    }
  }

  for (const skillName of sortedKeys(nextLock.skills)) {
    replacePath(path.join(tempRoot, "skills", skillName), path.join(root, ".agents", nextLock.skills[skillName].path));
  }

  for (const source of Object.values(nextLock.sources)) {
    replacePath(path.join(tempRoot, "licenses", path.basename(source.licensePath)), path.join(root, source.licensePath));
  }
}
