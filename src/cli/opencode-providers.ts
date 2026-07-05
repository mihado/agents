import path from "node:path";
import { fileURLToPath } from "node:url";
import { registry } from "../providers/index.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const command = process.argv[2];

if (!["--install", "--check"].includes(command) || process.argv.length !== 3) {
  console.error("Usage: node dist/cli/opencode-providers.js --install | --check");
  process.exit(1);
}

const opencode = registry.find((p) => p.name === "opencode")!;

if (command === "--check") {
  opencode.check(root);
} else {
  opencode.install(root);
}
