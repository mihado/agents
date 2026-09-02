import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import type { Provider } from "./types.js";
import { listSkills } from "../skills/inventory/discover.js";
import { validateFile, linkTarget, installSkills, checkLink, pruneManagedSymlinks } from "./shared/symlinks.js";
import { resolveExecutable, readJson } from "../core/commands.js";

function getHome(): string {
  return process.env.CLAUDE_HOME || path.join(os.homedir(), ".claude");
}

function getManagedAgentNames(sourceDir: string): Set<string> {
  if (!fs.existsSync(sourceDir)) return new Set<string>();

  return new Set(
    fs.readdirSync(sourceDir, { withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => entry.name),
  );
}

function installProviderAgents(root: string): void {
  const home = getHome();
  const agentSrc = path.join(root, "config", "providers", "claude", "agents");
  const agentDir = path.join(home, "agents");

  pruneManagedSymlinks(agentDir, agentSrc, getManagedAgentNames(agentSrc), "Claude agent");

  if (!fs.existsSync(agentSrc)) return;

  for (const entry of fs.readdirSync(agentSrc, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const source = path.join(agentSrc, entry.name);
    const target = path.join(agentDir, entry.name);
    linkTarget(source, target, `Claude agent ${entry.name}`);
  }
}

function checkProviderAgents(root: string): boolean {
  const home = getHome();
  const agentSrc = path.join(root, "config", "providers", "claude", "agents");
  let ok = true;

  if (!fs.existsSync(agentSrc)) return ok;

  for (const entry of fs.readdirSync(agentSrc, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
    const source = path.join(agentSrc, entry.name);
    const target = path.join(home, "agents", entry.name);
    if (!checkLink(source, target, `Claude agent ${entry.name}`)) ok = false;
  }

  return ok;
}

export const claude: Provider = {
  name: "claude",
  install(root: string): boolean {
    const home = getHome();
    const skills = listSkills(root);

    validateFile(path.join(root, "AGENTS.md"), path.join(home, "AGENTS.md"), "Claude shared instructions");
    validateFile(path.join(root, "CLAUDE.md"), path.join(home, "CLAUDE.md"), "Claude instructions");
    linkTarget(path.join(root, "AGENTS.md"), path.join(home, "AGENTS.md"), "Claude shared instructions");
    linkTarget(path.join(root, "CLAUDE.md"), path.join(home, "CLAUDE.md"), "Claude instructions");
    installSkills(home, root, "Claude", skills);
    installProviderAgents(root);

    return true;
  },
  check(root: string): boolean {
    const home = getHome();
    let ok = true;
    if (!checkLink(path.join(root, "AGENTS.md"), path.join(home, "AGENTS.md"), "Claude shared instructions")) ok = false;
    if (!checkLink(path.join(root, "CLAUDE.md"), path.join(home, "CLAUDE.md"), "Claude instructions")) ok = false;
    const skills = listSkills(root);
    for (const skill of skills) {
      if (!checkLink(skill.absPath, path.join(home, "skills", skill.name), `Claude skill ${skill.name}`)) ok = false;
    }
    if (!checkProviderAgents(root)) ok = false;
    return ok;
  },
};

export function resolveClaude(): string | null {
  return resolveExecutable(process.env.CLAUDE_CLI_PATH, "claude");
}

export function installClaudeMcp(claudePath: string, name: string, command: string, args: string[]): boolean {
  const result = spawnSync(claudePath, ["mcp", "add", "--scope", "user", name, "--", command, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    const msg = result.stderr.trim();
    if (msg.includes("already exists")) return false;
    console.error(`error   ${claudePath} mcp add ${name} failed:\n${msg}`);
    process.exit(1);
  }
  return true;
}

export function checkClaudeMcp(name: string, command: string, args: string[]): boolean {
  const claudeConfig = process.env.CLAUDE_CONFIG || path.join(os.homedir(), ".claude.json");
  if (!fs.existsSync(claudeConfig)) {
    console.error(`FAIL  Claude ${name} is not configured`);
    return false;
  }
  const config = readJson<{ mcpServers?: Record<string, unknown> }>(claudeConfig);
  const current = config.mcpServers?.[name];
  if (!current) {
    console.error(`FAIL  Claude ${name} is not configured`);
    return false;
  }
  const cur = current as Record<string, unknown>;
  const match = cur.type === "stdio" && cur.command === command &&
    JSON.stringify(cur.args || []) === JSON.stringify(args);
  if (match) {
    console.log(`PASS  Claude ${name} configured`);
    return true;
  }
  console.error(`FAIL  Claude ${name} configuration conflicts with mcp.json`);
  return false;
}
