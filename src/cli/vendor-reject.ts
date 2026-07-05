import path from "node:path";
import { fileURLToPath } from "node:url";
import fs from "node:fs";
import { readJson, fail, writeJson } from "../core/commands.js";
import { validateStageLock } from "../skills/inventory/lockfile.js";
import type { Lock } from "../skills/inventory/lockfile.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");

const skillName = process.env.SKILL;
if (!skillName) {
  console.error("Usage: make vendor-reject SKILL=<skill-name>");
  process.exit(1);
}

const stageDir = path.join(root, ".stage/skills");
const stageLockPath = path.join(root, ".stage", "stage-lock.json");

if (!fs.existsSync(stageDir)) {
  fail("No stage found. Run `make vendor` first.");
}

if (!fs.existsSync(stageLockPath)) {
  fail("No stage-lock.json found. Run `make vendor` first.");
}
const stageLock = readJson<Lock>(stageLockPath);
validateStageLock(stageLock);

if (!stageLock.skills[skillName]) {
  fail(`Skill '${skillName}' not found in stage. Available: ${Object.keys(stageLock.skills).join(", ")}`);
}

const skill = stageLock.skills[skillName];
const stageSkillPath = path.join(stageDir, skill.path.replace(/^skills\//, ""));

if (fs.existsSync(stageSkillPath)) {
  fs.rmSync(stageSkillPath, { recursive: true, force: true });
}

delete stageLock.skills[skillName];

const remainingSkills = Object.values(stageLock.skills).filter((s) => s.source === skill.source);
if (remainingSkills.length === 0) {
  const source = stageLock.sources[skill.source];
  if (source) {
    const stagedLicensePath = path.join(stageDir, "licenses", path.basename(source.licensePath));
    if (fs.existsSync(stagedLicensePath)) {
      fs.rmSync(stagedLicensePath, { force: true });
    }
    delete stageLock.sources[skill.source];
    console.log(`Cleaned up source '${skill.source}' and its staged license.`);
  }
}

writeJson(stageLockPath, stageLock);

console.log(`Rejected ${skillName} from stage.`);
console.log(`Remaining: ${Object.keys(stageLock.skills).length} skills in stage.`);