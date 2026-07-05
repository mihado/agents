import path from "node:path";
import { fail } from "../../core/commands.js";

export function validateLocalPath(localPath: string, skillName: string): void {
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

export function validateUpstreamPath(upstreamPath: string, label: string): void {
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

export function validateLicensePath(licensePath: string, label: string): void {
  if (
    path.isAbsolute(licensePath) ||
    !licensePath.startsWith(".agents/licenses/") ||
    path.posix.normalize(licensePath) !== licensePath
  ) {
    fail(`unsafe license path in ${label}: ${licensePath}`);
  }
}
