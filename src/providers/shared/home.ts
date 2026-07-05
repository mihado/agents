import path from "node:path";
import os from "node:os";

export function getHomeDirs(): { codex: string; claude: string; agents: string; kiro: string } {
  return {
    agents: process.env.AGENTS_HOME || path.join(os.homedir(), ".agents"),
    codex: process.env.CODEX_HOME || path.join(os.homedir(), ".codex"),
    claude: process.env.CLAUDE_HOME || path.join(os.homedir(), ".claude"),
    kiro: process.env.KIRO_HOME || path.join(os.homedir(), ".kiro"),
  };
}
