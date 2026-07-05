import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Provider } from "./types.js";
import { listSkills } from "../skills/inventory/discover.js";
import { installSkills, checkLink } from "./shared/symlinks.js";

function getHome(): string {
  return process.env.KIRO_HOME || path.join(os.homedir(), ".kiro");
}

export const kiro: Provider = {
  name: "kiro",
  install(root: string): boolean {
    const home = getHome();
    const skills = listSkills(root);
    fs.mkdirSync(home, { recursive: true });
    installSkills(home, root, "Kiro", skills);
    return true;
  },
  check(root: string): boolean {
    const home = getHome();
    let ok = true;
    const skills = listSkills(root);
    for (const skill of skills) {
      if (!checkLink(skill.absPath, path.join(home, "skills", skill.name), `Kiro skill ${skill.name}`)) ok = false;
    }
    return ok;
  },
};
