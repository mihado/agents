import path from "node:path";
import { fileURLToPath } from "node:url";
import { findOnPath } from "../core/commands.js";
import { registry } from "../providers/index.js";
import { listSkills, detectDuplicateNames } from "../skills/inventory/discover.js";
import { checkLockFile } from "../skills/inventory/lockfile.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");
let failures = 0;

function pass(label: string): void { console.log(`PASS  ${label}`); }
function fl(label: string): void { console.error(`FAIL  ${label}`); failures++; }

if (findOnPath("git")) pass("git available");
else fl("git is required");

if (findOnPath("node")) pass("node available");
else fl("node is required");

if (checkLockFile(root)) pass("skills manifest, lock, and hashes");
else fl("skills manifest, lock, or hashes");

for (const provider of registry) {
  if (!provider.check(root)) failures++;
}

const skills = listSkills(root);
for (const name of detectDuplicateNames(skills)) {
  fl(`duplicate skill name: ${name}`);
}

if (failures > 0) {
  console.error(`\nDoctor found ${failures} problem(s).`);
  process.exit(1);
}

console.log("\nDoctor found no problems.");