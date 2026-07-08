import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Provider } from "./types.js";
import { listSkills } from "../skills/inventory/discover.js";
import { installSkills, checkLink, linkTarget, pruneManagedSymlinks } from "./shared/symlinks.js";

function getHome(): string {
  return process.env.KIRO_HOME || path.join(os.homedir(), ".kiro");
}

function getManagedAgentNames(sourceDir: string): Set<string> {
  if (!fs.existsSync(sourceDir)) return new Set<string>();

  return new Set(
    fs.readdirSync(sourceDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && (entry.name.endsWith(".json") || entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")))
      .map((entry) => entry.name),
  );
}

function installProviderAgents(root: string): void {
  const home = getHome();
  const agentSrc = path.join(root, "config", "providers", "kiro", "agents");
  const agentDir = path.join(home, "agents");

  pruneManagedSymlinks(agentDir, agentSrc, getManagedAgentNames(agentSrc), "Kiro agent");

  if (!fs.existsSync(agentSrc)) return;

  for (const entry of fs.readdirSync(agentSrc, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".json") && !entry.name.endsWith(".yaml") && !entry.name.endsWith(".yml")) continue;
    const source = path.join(agentSrc, entry.name);
    const target = path.join(agentDir, entry.name);
    linkTarget(source, target, `Kiro agent ${entry.name}`);
  }
}

function checkProviderAgents(root: string): boolean {
  const home = getHome();
  const agentSrc = path.join(root, "config", "providers", "kiro", "agents");
  let ok = true;

  if (!fs.existsSync(agentSrc)) return ok;

  for (const entry of fs.readdirSync(agentSrc, { withFileTypes: true })) {
    if (!entry.isFile()) continue;
    if (!entry.name.endsWith(".json") && !entry.name.endsWith(".yaml") && !entry.name.endsWith(".yml")) continue;
    const source = path.join(agentSrc, entry.name);
    const target = path.join(home, "agents", entry.name);
    if (!checkLink(source, target, `Kiro agent ${entry.name}`)) ok = false;
  }

  return ok;
}

export const kiro: Provider = {
  name: "kiro",
  install(root: string): boolean {
    const home = getHome();
    const skills = listSkills(root);
    fs.mkdirSync(home, { recursive: true });
    installSkills(home, root, "Kiro", skills);
    installProviderAgents(root);
    return true;
  },
  check(root: string): boolean {
    const home = getHome();
    let ok = true;
    const skills = listSkills(root);
    for (const skill of skills) {
      if (!checkLink(skill.absPath, path.join(home, "skills", skill.name), `Kiro skill ${skill.name}`)) ok = false;
    }
    if (!checkProviderAgents(root)) ok = false;
    return ok;
  },
};
