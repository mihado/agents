import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Provider } from "./types.js";
import { listSkills } from "../skills/inventory/discover.js";
import { installSkills, checkLink } from "./shared/symlinks.js";

export const agents: Provider = {
  name: "agents",
  install(root: string): boolean {
    const home = process.env.AGENTS_HOME || path.join(os.homedir(), ".agents");
    const skills = listSkills(root);
    fs.mkdirSync(home, { recursive: true });
    installSkills(home, root, "Agents", skills);
    return true;
  },
  check(root: string): boolean {
    const home = process.env.AGENTS_HOME || path.join(os.homedir(), ".agents");
    let ok = true;
    const skills = listSkills(root);
    for (const skill of skills) {
      if (!checkLink(skill.absPath, path.join(home, "skills", skill.name), `Agents skill ${skill.name}`)) ok = false;
    }
    return ok;
  },
};
