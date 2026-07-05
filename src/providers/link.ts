import fs from "node:fs";
import path from "node:path";
import { registry } from "./index.js";

export function runLink(root: string): void {
  fs.mkdirSync(path.join(root, ".agents/skills"), { recursive: true });

  for (const provider of registry) {
    provider.install(root);
  }

  console.log("\nInstallation complete. Run `apm check` to verify.");
}
