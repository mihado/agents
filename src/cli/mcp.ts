import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadMcpManifest, resolveTools } from "../providers/opencode/config.js";
import { installCodexMcp, checkCodexMcp } from "../providers/codex.js";
import { installClaudeMcp, checkClaudeMcp } from "../providers/claude.js";
import { fail } from "../core/commands.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const command = process.argv[2];

if (!["--install", "--check"].includes(command) || process.argv.length !== 3) {
  console.error("Usage: node dist/cli/mcp.js --install | --check");
  process.exit(1);
}

if (command === "--check") {
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

  if (failures > 0) process.exit(1);
} else {
  const manifest = loadMcpManifest(root);
  const tools = resolveTools();

  if (!tools.codex && !tools.claude) {
    fail("no supported tool installed (codex or claude)");
  }

  for (const [name, server] of Object.entries(manifest.servers)) {
    if (tools.codex && server.command) {
      installCodexMcp(tools.codex, name, server.command, server.args);
      console.log(`installed: Codex ${name}`);
    }
    if (tools.claude) {
      installClaudeMcp(tools.claude, name, server.command, server.args);
      console.log(`installed: Claude ${name}`);
    }
  }
}
