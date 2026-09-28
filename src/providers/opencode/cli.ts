import fs from "node:fs";
import path from "node:path";
import { readJson, fail } from "../../core/commands.js";
import { getConfigHome } from "../../core/paths.js";

export function getCliConfigPath(): string {
  return path.join(getConfigHome(), "opencode", "cli.json");
}

export function loadCliManifest(root: string): Record<string, unknown> {
  const manifest = readJson<Record<string, unknown>>(
    path.join(root, "config", "providers", "opencode", "cli.json"),
  );
  if (manifest === null || typeof manifest !== "object" || Array.isArray(manifest)) {
    fail("opencode cli.json manifest must be an object");
  }
  return manifest;
}

export function installCliConfig(root: string): void {
  const expected = loadCliManifest(root);
  const configPath = getCliConfigPath();
  // readJson exits on malformed input: never silently overwrite an unreadable config.
  const current = fs.existsSync(configPath) ? readJson<Record<string, unknown>>(configPath) : null;
  if (current && JSON.stringify(current) === JSON.stringify(expected)) {
    console.log("ok      cli.json");
    return;
  }
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(expected, null, 2) + "\n");
  console.log("linked  cli.json");
  console.log(`wrote: ${configPath}`);
}

export function checkCliConfig(root: string): boolean {
  const expected = loadCliManifest(root);
  const configPath = getCliConfigPath();
  if (!fs.existsSync(configPath)) {
    console.error(`FAIL  cli.json not configured (config: ${configPath})`);
    return false;
  }
  // readJson exits on malformed input: a corrupt config is loud, not a drift FAIL.
  const current = readJson<Record<string, unknown>>(configPath);
  if (JSON.stringify(current) === JSON.stringify(expected)) {
    console.log("PASS  cli.json configured");
    return true;
  }
  console.error(`FAIL  cli.json differs from manifest (config: ${configPath})`);
  return false;
}
