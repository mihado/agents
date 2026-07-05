import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../providers/index.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");

fs.mkdirSync(path.join(root, ".agents/skills"), { recursive: true });

for (const provider of registry) {
  provider.install(root);
}

console.log("\nInstallation complete. Run `make check` to verify.");