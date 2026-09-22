import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fetchSkills } from "./fetch.js";

function git(cwd: string, ...args: string[]): void {
  const result = spawnSync(
    "git",
    ["-c", "user.email=test@example.com", "-c", "user.name=test", ...args],
    { cwd, encoding: "utf8" },
  );
  if (result.status !== 0) throw new Error(`git ${args.join(" ")}: ${result.stderr}`);
}

/** Local upstream repo with a CLAUDE.md symlink, the shape that broke fetch. */
function makeUpstream(): string {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-upstream-"));
  const skill = path.join(dir, "skills/test-skill");
  fs.mkdirSync(skill, { recursive: true });
  fs.writeFileSync(path.join(dir, "LICENSE"), "MIT\n");
  fs.writeFileSync(path.join(skill, "SKILL.md"), "---\nname: test-skill\n---\n# Skill\n");
  fs.writeFileSync(path.join(skill, "AGENTS.md"), "# Agents sidecar\n");
  fs.symlinkSync("AGENTS.md", path.join(skill, "CLAUDE.md"));
  git(dir, "init", "-q", "-b", "main");
  git(dir, "add", "-A");
  git(dir, "commit", "-qm", "init");
  return dir;
}

function makeRoot(upstream: string): string {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "fetch-root-"));
  fs.mkdirSync(path.join(root, "config/skills"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "config/skills/manifest.json"),
    `${JSON.stringify(
      {
        version: 1,
        sources: {
          "local/test-skills": {
            repository: upstream,
            ref: "main",
            license: { name: "MIT", path: "LICENSE" },
          },
        },
        skills: {
          "test-skill": {
            source: "local/test-skills",
            srcPath: "skills/test-skill",
            path: "skills/engineering/test-skill",
          },
        },
      },
      null,
      2,
    )}\n`,
  );
  return root;
}

let exited: number[];
let stderr: string[];

beforeEach(() => {
  exited = [];
  stderr = [];
  vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    exited.push(code ?? 0);
    throw new Error(`process.exit:${code ?? 0}`);
  }) as never);
  vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => {
    stderr.push(args.join(" "));
  });
  vi.spyOn(console, "log").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("fetchSkills with symlinked skill files", () => {
  it("dereferences symlinks into regular files in the staged tree", () => {
    const upstream = makeUpstream();
    const root = makeRoot(upstream);
    try {
      fetchSkills(root);

      const staged = path.join(root, ".stage/skills/engineering/test-skill/CLAUDE.md");
      expect(fs.lstatSync(staged).isSymbolicLink()).toBe(false);
      expect(fs.readFileSync(staged, "utf8")).toBe("# Agents sidecar\n");
      expect(fs.existsSync(path.join(root, ".stage/stage-lock.json"))).toBe(true);
    } finally {
      fs.rmSync(upstream, { recursive: true, force: true });
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("refuses a symlink that escapes the clone", () => {
    const upstream = makeUpstream();
    const root = makeRoot(upstream);
    const outside = path.join(os.tmpdir(), `fetch-secret-${Date.now()}`);
    fs.writeFileSync(outside, "secret\n");
    fs.rmSync(path.join(upstream, "skills/test-skill/CLAUDE.md"));
    fs.symlinkSync(outside, path.join(upstream, "skills/test-skill/CLAUDE.md"));
    git(upstream, "add", "-A");
    git(upstream, "commit", "-qm", "escape");
    try {
      expect(() => fetchSkills(root)).toThrow("process.exit:1");
      expect(stderr.join("\n")).toContain("symlink escapes vendored source");
      expect(fs.existsSync(path.join(root, ".stage/stage-lock.json"))).toBe(false);
      expect(exited).toEqual([1]);
    } finally {
      fs.rmSync(upstream, { recursive: true, force: true });
      fs.rmSync(root, { recursive: true, force: true });
      fs.rmSync(outside, { force: true });
    }
  });
});
