import fs from "node:fs";
import path from "node:path";

export function validateFile(source: string, target: string, label: string): void {
  if (fs.lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink()) {
    const existing = fs.readlinkSync(target);
    if (existing === source) return;
    console.error(`error   ${label} is a foreign symlink to ${existing}`);
    process.exit(1);
  }

  if (fs.existsSync(target)) {
    console.error(`error   ${label} already exists and will not be overwritten`);
    process.exit(1);
  }
}

export function validateSkill(source: string, target: string, label: string, root: string): void {
  if (fs.lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink()) {
    const existing = fs.readlinkSync(target);
    if (existing === source) return;
    if (existing.startsWith(path.join(root, ".agents/skills/"))) return;
    console.error(`error   ${label} is a foreign symlink to ${existing}`);
    process.exit(1);
  }

  if (fs.existsSync(target)) {
    console.error(`error   ${label} already exists and will not be overwritten`);
    process.exit(1);
  }
}

export function linkTarget(source: string, target: string, label: string): void {
  fs.mkdirSync(path.dirname(target), { recursive: true });
  if (fs.lstatSync(target, { throwIfNoEntry: false })?.isSymbolicLink()) {
    const existing = fs.readlinkSync(target);
    if (existing === source) {
      console.log(`ok      ${label}`);
      return;
    }
    fs.unlinkSync(target);
  }
  fs.symlinkSync(source, target);
  console.log(`linked  ${label}`);
}

export function pruneStaleSkills(home: string, root: string, labelPrefix: string, expectedNames: Set<string>): void {
  const skillsDir = path.join(home, "skills");
  if (!fs.existsSync(skillsDir)) return;

  for (const entry of fs.readdirSync(skillsDir, { withFileTypes: true })) {
    if (!entry.isSymbolicLink()) continue;
    const linkPath = path.join(skillsDir, entry.name);
    const target = fs.readlinkSync(linkPath);
    if (target.startsWith(path.join(root, ".agents/skills/")) && (!fs.existsSync(target) || !expectedNames.has(entry.name))) {
      fs.unlinkSync(linkPath);
      const reason = !fs.existsSync(target) ? "target gone" : "no longer managed";
      console.log(`pruned  ${labelPrefix} skill ${entry.name} (${reason})`);
    }
  }
}

export function pruneManagedSymlinks(
  dir: string,
  managedSourceDir: string,
  expectedNames: Set<string>,
  labelPrefix: string,
): void {
  if (!fs.existsSync(dir)) return;

  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const linkPath = path.join(dir, entry.name);
    if (!fs.lstatSync(linkPath, { throwIfNoEntry: false })?.isSymbolicLink()) continue;
    const target = fs.readlinkSync(linkPath);
    if (!target.startsWith(managedSourceDir)) continue;

    if (!fs.existsSync(target) || !expectedNames.has(entry.name)) {
      fs.unlinkSync(linkPath);
      const reason = !fs.existsSync(target) ? "target gone" : "no longer managed";
      console.log(`pruned  ${labelPrefix} ${entry.name} (${reason})`);
    }
  }
}

export function checkLink(
  expectedTarget: string,
  linkPath: string,
  label: string,
): boolean {
  const stat = fs.lstatSync(linkPath, { throwIfNoEntry: false });
  if (!stat?.isSymbolicLink()) {
    console.error(`FAIL  ${label} is not a symlink: ${linkPath}`);
    return false;
  }
  const actual = fs.readlinkSync(linkPath);
  if (actual !== expectedTarget) {
    console.error(`FAIL  ${label} points to ${actual}, expected ${expectedTarget}`);
    return false;
  }
  if (!fs.existsSync(linkPath)) {
    console.error(`FAIL  ${label} is broken: ${linkPath}`);
    return false;
  }
  console.log(`PASS  ${label}`);
  return true;
}

export function installSkills(home: string, root: string, labelPrefix: string, skills: { name: string; absPath: string }[]): void {
  pruneStaleSkills(home, root, labelPrefix, new Set(skills.map((skill) => skill.name)));

  for (const skill of skills) {
    const target = path.join(home, "skills", skill.name);
    validateSkill(skill.absPath, target, `${labelPrefix} skill ${skill.name}`, root);
  }

  for (const skill of skills) {
    const target = path.join(home, "skills", skill.name);
    linkTarget(skill.absPath, target, `${labelPrefix} skill ${skill.name}`);
  }
}
