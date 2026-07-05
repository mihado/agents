import fs from "node:fs";
import path from "node:path";

export interface SkillEntry {
  name: string;
  absPath: string;
  relPath: string;
}

export function listSkills(root: string): SkillEntry[] {
  const skillsBase = path.join(root, ".agents/skills");
  if (!fs.existsSync(skillsBase)) return [];

  const results: SkillEntry[] = [];
  for (const category of fs.readdirSync(skillsBase, { withFileTypes: true })) {
    if (!category.isDirectory()) continue;
    const catPath = path.join(skillsBase, category.name);
    for (const skill of fs.readdirSync(catPath, { withFileTypes: true })) {
      if (!skill.isDirectory()) continue;
      const absPath = path.join(catPath, skill.name, "SKILL.md");
      if (fs.existsSync(absPath)) {
        results.push({
          name: skill.name,
          absPath: path.join(catPath, skill.name),
          relPath: path.relative(root, path.join(catPath, skill.name)),
        });
      }
    }
  }
  return results.sort((a, b) => a.relPath.localeCompare(b.relPath));
}

export function detectDuplicateNames(skills: SkillEntry[]): string[] {
  const seen = new Map<string, string[]>();
  for (const skill of skills) {
    const existing = seen.get(skill.name) || [];
    existing.push(skill.relPath);
    seen.set(skill.name, existing);
  }
  const duplicates: string[] = [];
  for (const [name, paths] of seen) {
    if (paths.length > 1) duplicates.push(name);
  }
  return duplicates.sort();
}
