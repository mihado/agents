import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { readJson, writeJson, fail } from "../core/commands.js";
import type { Lock } from "../skills/inventory/lockfile.js";
import { validateSkillPath, validateLicensePath } from "../skills/inventory/lockfile.js";

export function removeSkillFromLock(root: string, skillName: string): Lock {
  const lockPath = path.join(root, "config", "skills", "lock.json");

  const lock = readJson<Lock>(lockPath);

  if (!lock.skills[skillName]) {
    fail(`Skill '${skillName}' not found in lock.json.`);
  }

  const skill = lock.skills[skillName];
  const sourceName = skill.source;
  validateSkillPath(skill.path, `lock skill ${skillName}`);
  const livePath = path.join(root, ".agents", skill.path);

  if (fs.existsSync(livePath)) {
    fs.rmSync(livePath, { recursive: true, force: true });
  }

  delete lock.skills[skillName];

  const remainingSkills = Object.values(lock.skills).filter((s) => s.source === sourceName);
  if (remainingSkills.length === 0) {
    const source = lock.sources[sourceName];
    if (source) {
      validateLicensePath(source.licensePath, `lock source ${sourceName}`);
      const licensePath = path.join(root, source.licensePath);
      if (fs.existsSync(licensePath)) {
        fs.rmSync(licensePath, { force: true });
      }
      delete lock.sources[sourceName];
      console.log(`Cleaned up source '${sourceName}' and its license.`);
    }
  }

  writeJson(lockPath, lock);
  return lock;
}

const isMain = import.meta.url === `file://${process.argv[1]}`;
if (isMain) {
  const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
  const skillName = process.env.SKILL;
  if (!skillName) {
    console.error("Usage: make vendor-remove SKILL=<skill-name>");
    process.exit(1);
  }
  removeSkillFromLock(root, skillName);
  console.log(`Removed ${skillName}.`);
}
