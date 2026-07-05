import fs from "node:fs";
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

export const opencode: Provider = {
  name: "opencode",
  install(root: string): boolean {
    installProviders(root);

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
