import { loadMcpManifest, resolveTools } from "./opencode/config.js";
import { installCodexMcp, checkCodexMcp } from "./codex.js";
import { installClaudeMcp, checkClaudeMcp } from "./claude.js";
import { fail } from "../core/commands.js";

export function installMcp(root: string): void {
  const manifest = loadMcpManifest(root);
  const tools = resolveTools();

  if (!tools.codex && !tools.claude) {
    fail("no supported tool installed (codex or claude)");
  }

  for (const [name, server] of Object.entries(manifest.servers)) {
    if (tools.codex && server.command) {
      installCodexMcp(tools.codex, name, server.command, server.args);
      console.log(`linked  Codex ${name}`);
    }
    if (tools.claude) {
      const added = installClaudeMcp(tools.claude, name, server.command, server.args);
      console.log(added ? `linked  Claude ${name}` : `ok      Claude ${name}`);
    }
  }
}

export function checkMcp(root: string): void {
  const manifest = loadMcpManifest(root);
  const tools = resolveTools();
  let failures = 0;

  if (!tools.codex && !tools.claude) {
    fail("no supported tool installed (codex or claude)");
  }

  for (const [name, server] of Object.entries(manifest.servers)) {
    if (tools.codex && !checkCodexMcp(tools.codex, name, server.command, server.args)) failures++;
    if (tools.claude && !checkClaudeMcp(name, server.command, server.args)) failures++;
  }

  if (failures > 0) {
    fail(`mcp check found ${failures} problem(s)`);
  }
}
