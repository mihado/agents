import fs from "node:fs";
import path from "node:path";
import { getConfigHome } from "../../core/paths.js";
import { linkTarget, checkLink } from "../shared/symlinks.js";
import type { Provider } from "../types.js";
import {
  loadMcpManifest,
  resolveTools,
  getOpenCodeConfigPath,
  installOpenCodeMcp,
  checkOpenCodeMcp,
  installProviders,
  checkProviders,
} from "./config.js";

function getOpenCodeHome(): string {
  return path.join(getConfigHome(), "opencode");
}

function installProviderFiles(root: string): void {
  const home = getOpenCodeHome();
  const agentSrc = path.join(root, "config", "providers", "opencode", "agents");
  const cmdSrc = path.join(root, "config", "providers", "opencode", "commands");

  if (fs.existsSync(agentSrc)) {
    for (const entry of fs.readdirSync(agentSrc, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const source = path.join(agentSrc, entry.name);
      const target = path.join(home, "agents", entry.name);
      linkTarget(source, target, `OpenCode agent ${entry.name}`);
    }
  }

  if (fs.existsSync(cmdSrc)) {
    for (const entry of fs.readdirSync(cmdSrc, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const source = path.join(cmdSrc, entry.name);
      const target = path.join(home, "commands", entry.name);
      linkTarget(source, target, `OpenCode command ${entry.name}`);
    }
  }
}

function checkProviderFiles(root: string): boolean {
  const home = getOpenCodeHome();
  const agentSrc = path.join(root, "config", "providers", "opencode", "agents");
  const cmdSrc = path.join(root, "config", "providers", "opencode", "commands");
  let ok = true;

  if (fs.existsSync(agentSrc)) {
    for (const entry of fs.readdirSync(agentSrc, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const source = path.join(agentSrc, entry.name);
      const target = path.join(home, "agents", entry.name);
      if (!checkLink(source, target, `OpenCode agent ${entry.name}`)) ok = false;
    }
  }

  if (fs.existsSync(cmdSrc)) {
    for (const entry of fs.readdirSync(cmdSrc, { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith(".md")) continue;
      const source = path.join(cmdSrc, entry.name);
      const target = path.join(home, "commands", entry.name);
      if (!checkLink(source, target, `OpenCode command ${entry.name}`)) ok = false;
    }
  }

  return ok;
}

export const opencode: Provider = {
  name: "opencode",
  install(root: string): boolean {
    installProviders(root);
    installProviderFiles(root);

    const manifest = loadMcpManifest(root);
    const tools = resolveTools();
    if (!tools.opencode) return true;

    const configPath = getOpenCodeConfigPath();
    const config: Record<string, unknown> = fs.existsSync(configPath)
      ? JSON.parse(fs.readFileSync(configPath, "utf8")) : {};
    if (!config.mcp) config.mcp = {};
    let changed = false;

    for (const [name, server] of Object.entries(manifest.servers)) {
      changed = installOpenCodeMcp(name, server, config) || changed;
    }

    if (changed) {
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
      console.log(`wrote: ${configPath}`);
    }

    return true;
  },
  check(root: string): boolean {
    let ok = checkProviders(root);
    if (!checkProviderFiles(root)) ok = false;

    const manifest = loadMcpManifest(root);
    const tools = resolveTools();
    if (tools.opencode) {
      for (const [name, server] of Object.entries(manifest.servers)) {
        if (!checkOpenCodeMcp(name, server)) ok = false;
      }
    }

    return ok;
  },
};
