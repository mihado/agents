import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import type { Provider } from "./types.js";
import { listSkills } from "../skills/inventory/discover.js";
import { validateFile, linkTarget, installSkills, checkLink } from "./shared/symlinks.js";
import { resolveExecutable } from "../core/commands.js";

function getHome(): string {
  return process.env.CODEX_HOME || path.join(os.homedir(), ".codex");
}

export const codex: Provider = {
  name: "codex",
  install(root: string): boolean {
    const home = getHome();
    const skills = listSkills(root);

    validateFile(path.join(root, "AGENTS.md"), path.join(home, "AGENTS.md"), "Codex instructions");
    linkTarget(path.join(root, "AGENTS.md"), path.join(home, "AGENTS.md"), "Codex instructions");
    installSkills(home, root, "Codex", skills);

    return true;
  },
  check(root: string): boolean {
    const home = getHome();
    let ok = true;
    if (!checkLink(path.join(root, "AGENTS.md"), path.join(home, "AGENTS.md"), "Codex instructions")) ok = false;
    const skills = listSkills(root);
    for (const skill of skills) {
      if (!checkLink(skill.absPath, path.join(home, "skills", skill.name), `Codex skill ${skill.name}`)) ok = false;
    }
    return ok;
  },
};

export function resolveCodex(): string | null {
  return resolveExecutable(
    process.env.CODEX_CLI_PATH,
    "codex",
    "/Applications/Codex.app/Contents/Resources/codex",
  );
}

export function installCodexMcp(codexPath: string, name: string, command: string, args: string[]): boolean {
  const result = spawnSync(codexPath, ["mcp", "add", name, "--", command, ...args], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`error   ${codexPath} mcp add ${name} failed:\n${result.stderr.trim()}`);
    process.exit(1);
  }
  return true;
}

export function checkCodexMcp(codexPath: string, name: string, command: string, args: string[]): boolean {
  const result = spawnSync(codexPath, ["mcp", "get", name], { encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`FAIL  Codex ${name} is not configured`);
    return false;
  }
  const details = parseKeyValueOutput(result.stdout);
  const argStr = args.join(" ");
  const match = details.transport === "stdio" && details.command === command && details.args === (argStr || "-");
  if (match) {
    console.log(`PASS  Codex ${name} configured`);
    return true;
  }
  console.error(`FAIL  Codex ${name} configuration conflicts with mcp.json`);
  return false;
}

function parseKeyValueOutput(output: string): Record<string, string> {
  const values: Record<string, string> = {};
  for (const line of output.split("\n")) {
    const match = line.match(/^\s+([a-z]+):\s*(.*)$/);
    if (match) values[match[1]] = match[2];
  }
  return values;
}
