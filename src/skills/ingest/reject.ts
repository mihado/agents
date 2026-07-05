import path from "node:path";
import fs from "node:fs";
import { readJson, writeJson, fail } from "../../core/commands.js";
import type { Lock } from "../inventory/lockfile.js";
import { validateStageLock } from "../inventory/lockfile.js";

export interface RejectStageResult {
  skillName: string;
  remainingSkills: number;
  cleanedSourceName?: string;
}

export function rejectSkillFromStage(root: string, skillName: string): RejectStageResult {
  const stageDir = path.join(root, ".stage/skills");
  if (!fs.existsSync(stageDir)) {
    fail("No stage found. Run `apm skills fetch` first.");
  }

  const stageLockPath = path.join(root, ".stage", "stage-lock.json");
  if (!fs.existsSync(stageLockPath)) {
    fail("No stage-lock.json found. Run `apm skills fetch` first.");
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

  let cleanedSourceName: string | undefined;
  const remainingSkills = Object.values(stageLock.skills).filter((s) => s.source === skill.source);
  if (remainingSkills.length === 0) {
    const source = stageLock.sources[skill.source];
    if (source) {
      const stagedLicensePath = path.join(stageDir, "licenses", path.basename(source.licensePath));
      if (fs.existsSync(stagedLicensePath)) {
        fs.rmSync(stagedLicensePath, { force: true });
      }
      delete stageLock.sources[skill.source];
      cleanedSourceName = skill.source;
    }
  }

  writeJson(stageLockPath, stageLock);

  return {
    skillName,
    remainingSkills: Object.keys(stageLock.skills).length,
    cleanedSourceName,
  };
}
