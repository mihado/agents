import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

export function getRepoRoot(): string {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  return path.resolve(cliDir, "../../..");
}

export function getConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}
