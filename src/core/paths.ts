import path from "node:path";
import os from "node:os";

export function getConfigHome(): string {
  return process.env.XDG_CONFIG_HOME || path.join(os.homedir(), ".config");
}
