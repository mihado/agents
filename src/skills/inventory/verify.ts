import path from "node:path";
import { validateManifest } from "./manifest.js";
import { validateLock } from "./lockfile.js";
import { verifyWorkingCopy } from "../integrity/integrity.js";
import { readJson } from "../../core/commands.js";
import type { Manifest } from "./manifest.js";
import type { Lock } from "./lockfile.js";

export function verifyLock(root: string): { skills: number; licenses: number } {
  const manifestPath = path.join(root, "config", "skills", "manifest.json");
  const lockPath = path.join(root, "config", "skills", "lock.json");

  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);
  const lock = readJson<Lock>(lockPath);
  validateLock(manifest, lock);
  verifyWorkingCopy(root, lock);

  return {
    skills: Object.keys(lock.skills).length,
    licenses: Object.keys(lock.sources).length,
  };
}
