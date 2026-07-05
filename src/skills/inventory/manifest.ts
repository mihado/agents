import path from "node:path";
import { readJson, fail } from "../../core/commands.js";

export interface ManifestSource {
  repository: string;
  ref: string;
  license: { name: string; path: string };
}

export interface ManifestSkill {
  source: string;
  srcPath: string;
  path: string;
}

export interface Manifest {
  version: number;
  sources: Record<string, ManifestSource>;
  skills: Record<string, ManifestSkill>;
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function validateUpstreamPath(upstreamPath: string, label: string): void {
  if (
    path.isAbsolute(upstreamPath) ||
    path.posix.normalize(upstreamPath) !== upstreamPath ||
    upstreamPath.startsWith("../") ||
    upstreamPath === ".." ||
    upstreamPath === "."
  ) {
    fail(`unsafe upstream path in ${label}: ${upstreamPath}`);
  }
}

function validateLocalPath(localPath: string, skillName: string): void {
  if (
    path.isAbsolute(localPath) ||
    path.posix.normalize(localPath) !== localPath ||
    localPath === "skills" ||
    !localPath.startsWith("skills/") ||
    localPath.endsWith("/")
  ) {
    fail(`invalid local path for ${skillName}: ${localPath}`);
  }
}

export function sortedKeys(value: Record<string, unknown>): string[] {
  return Object.keys(value).sort();
}

export function loadManifest(root: string): Manifest {
  const manifestPath = path.join(root, "config", "skills", "manifest.json");
  const manifest = readJson<Manifest>(manifestPath);
  validateManifest(manifest);
  return manifest;
}

export function validateManifest(raw: unknown): asserts raw is Manifest {
  const manifest = raw as Manifest;
  if (manifest.version !== 1) fail("manifest.json version must be 1");
  if (!isObject(manifest.sources) || !isObject(manifest.skills)) {
    fail("manifest.json must contain sources and skills objects");
  }

  for (const [sourceName, source] of Object.entries(manifest.sources)) {
    if (!sourceName || !source.repository || !source.ref || !source.license?.name || !source.license?.path) {
      fail(`incomplete source in manifest.json: ${sourceName}`);
    }
    validateUpstreamPath(source.license.path, `source ${sourceName} license.path`);
  }

  const localPaths = new Set<string>();
  for (const [skillName, skill] of Object.entries(manifest.skills)) {
    if (!skillName || !skill.source || !skill.srcPath || !skill.path) {
      fail(`incomplete skill in manifest.json: ${skillName}`);
    }
    if (!/^[a-zA-Z0-9._-]+$/.test(skillName)) {
      fail(`invalid skill name (only letters, digits, '.', '-', '_' allowed): ${skillName}`);
    }
    validateUpstreamPath(skill.srcPath, `skill ${skillName} srcPath`);
    if (!manifest.sources[skill.source]) {
      fail(`unknown source for ${skillName}: ${skill.source}`);
    }
    validateLocalPath(skill.path, skillName);
    if (path.posix.basename(skill.path) !== skillName) {
      fail(`local path must end with the skill name ${skillName}: ${skill.path}`);
    }
    if (localPaths.has(skill.path)) {
      fail(`duplicate local skill path: ${skill.path}`);
    }
    localPaths.add(skill.path);
  }
}
