import path from "node:path";
import { fileURLToPath } from "node:url";
import { fetchSkills } from "../skills/ingest/fetch.js";
import { validateManifest } from "../skills/inventory/manifest.js";
import { validateLock } from "../skills/inventory/lockfile.js";
import { verifyWorkingCopy } from "../skills/integrity/integrity.js";
import { readJson } from "../core/commands.js";
import type { Manifest } from "../skills/inventory/manifest.js";
import type { Lock } from "../skills/inventory/lockfile.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
const manifestPath = path.join(root, "config", "skills", "manifest.json");
const lockPath = path.join(root, "config", "skills", "lock.json");
const command = process.argv[2];

if (!["--check", "--fetch"].includes(command) || process.argv.length !== 3) {
  console.error("Usage: node dist/cli/vendor.js --check | --fetch");
  process.exit(1);
}

if (command === "--check") {
  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);
  const lock = readJson<Lock>(lockPath);
  validateLock(manifest, lock);
  verifyWorkingCopy(root, lock);
  console.log(`Verified ${Object.keys(lock.skills).length} vendored skills and ${Object.keys(lock.sources).length} licenses.`);
  process.exit(0);
}

fetchSkills(root);
