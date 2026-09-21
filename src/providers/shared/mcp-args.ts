import type { McpServerDef } from "../opencode/config.js";

/**
 * Chrome DevTools needs a desktop session to run headed. macOS is the only
 * host we run headed; on Linux VMs and SSH sessions force --headless or
 * Chrome exits immediately with "Target closed". Applies to every harness
 * (OpenCode, Codex, Claude) since they all launch the same binary.
 */
export function platformMcpArgs(server: McpServerDef, platform: NodeJS.Platform = process.platform): string[] {
  if (server.type !== "stdio") return [];
  const args = [...server.args];
  if (
    platform !== "darwin" &&
    args.some((arg) => arg.startsWith("chrome-devtools-mcp")) &&
    !args.includes("--headless")
  ) {
    args.push("--headless");
  }
  return args;
}
