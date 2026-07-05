import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Lock } from "../inventory/lockfile.js";
import { validateLock } from "../inventory/lockfile.js";
import type { Manifest } from "../inventory/manifest.js";
import { promoteStagedContent } from "./promote.js";

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeSkill(root: string, skillPath: string, content: string, extraFile?: string): void {
  const dir = path.join(root, ".agents", skillPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), content);
  if (extraFile) {
    fs.writeFileSync(path.join(dir, extraFile), "extra");
  }
}

function writeStagedSkill(root: string, skillPath: string, content: string): void {
  const dir = path.join(root, ".stage/skills", skillPath.replace(/^skills\//, ""));
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "SKILL.md"), content);
}

describe("promoteStagedContent", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("preserves a rejected sibling from the same source while promoting another sibling", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "promote-test-"));
    try {
      const manifest: Manifest = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/a.git",
          ref: "main",
          license: { name: "MIT", path: "LICENSE" },
        },
      },
      skills: {
        "skill-a": { source: "source-a", srcPath: "skills/skill-a", path: "skills/design/skill-a" },
        "skill-b": { source: "source-a", srcPath: "skills/skill-b", path: "skills/design/skill-b" },
      },
    };

    const previousLock: Lock = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/a.git",
          ref: "main",
          license: "MIT",
          licensePath: ".agents/licenses/source-a-LICENSE",
          licenseSha256: "old-license-sha",
        },
      },
      skills: {
        "skill-a": {
          source: "source-a",
          srcPath: "skills/skill-a",
          path: "skills/design/skill-a",
          commit: "old-commit",
          sha256: "old-a-sha",
        },
        "skill-b": {
          source: "source-a",
          srcPath: "skills/skill-b",
          path: "skills/design/skill-b",
          commit: "old-commit",
          sha256: "old-b-sha",
        },
      },
    };

    const stageLock: Lock = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/a.git",
          ref: "main",
          license: "MIT",
          licensePath: ".agents/licenses/source-a-LICENSE",
          licenseSha256: "new-license-sha",
        },
      },
      skills: {
        "skill-b": {
          source: "source-a",
          srcPath: "skills/skill-b",
          path: "skills/design/skill-b",
          commit: "new-commit",
          sha256: "new-b-sha",
        },
      },
    };

    writeJson(path.join(root, "config/skills/manifest.json"), manifest);
    writeJson(path.join(root, "config/skills/lock.json"), previousLock);
    writeJson(path.join(root, ".stage/stage-lock.json"), stageLock);

    writeSkill(root, "skills/design/skill-a", "old skill A");
    writeSkill(root, "skills/design/skill-b", "old skill B", "obsolete.txt");
    writeStagedSkill(root, "skills/design/skill-b", "new skill B");
    fs.mkdirSync(path.join(root, ".agents/licenses"), { recursive: true });
    fs.writeFileSync(path.join(root, ".agents/licenses/source-a-LICENSE"), "old-license");
    fs.mkdirSync(path.join(root, ".stage/skills/licenses"), { recursive: true });
    fs.writeFileSync(path.join(root, ".stage/skills/licenses/source-a-LICENSE"), "new-license");

    const liveLock = promoteStagedContent(root);

    expect(liveLock.version).toBe(1);
    expect(liveLock.skills["skill-a"].commit).toBe("old-commit");
    expect(liveLock.skills["skill-b"].commit).toBe("new-commit");
    expect(fs.readFileSync(path.join(root, ".agents/skills/design/skill-a/SKILL.md"), "utf8")).toBe("old skill A");
    expect(fs.readFileSync(path.join(root, ".agents/skills/design/skill-b/SKILL.md"), "utf8")).toBe("new skill B");
    expect(fs.existsSync(path.join(root, ".agents/skills/design/skill-b/obsolete.txt"))).toBe(false);
    expect(() => validateLock(manifest, liveLock)).not.toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("removes stale live directory when skill path changes between accept cycles", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "promote-test-"));
    try {
      const manifest: Manifest = {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/a.git",
            ref: "main",
            license: { name: "MIT", path: "LICENSE" },
          },
        },
        skills: {
          "skill-a": { source: "source-a", srcPath: "skills/skill-a", path: "skills/engineering/skill-a" },
        },
      };

      const previousLock: Lock = {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "old-license-sha",
          },
        },
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "skills/skill-a",
            path: "skills/design/skill-a",
            commit: "old-commit",
            sha256: "old-a-sha",
          },
        },
      };

      const stageLock: Lock = {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "new-license-sha",
          },
        },
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "skills/skill-a",
            path: "skills/engineering/skill-a",
            commit: "new-commit",
            sha256: "new-a-sha",
          },
        },
      };

      writeJson(path.join(root, "config/skills/manifest.json"), manifest);
      writeJson(path.join(root, "config/skills/lock.json"), previousLock);
      writeJson(path.join(root, ".stage/stage-lock.json"), stageLock);

      writeSkill(root, "skills/design/skill-a", "old content at old path");
      writeStagedSkill(root, "skills/engineering/skill-a", "new content at new path");
      fs.mkdirSync(path.join(root, ".agents/licenses"), { recursive: true });
      fs.writeFileSync(path.join(root, ".agents/licenses/source-a-LICENSE"), "old-license");
      fs.mkdirSync(path.join(root, ".stage/skills/licenses"), { recursive: true });
      fs.writeFileSync(path.join(root, ".stage/skills/licenses/source-a-LICENSE"), "new-license");

      const liveLock = promoteStagedContent(root);

      expect(liveLock.skills["skill-a"].commit).toBe("new-commit");
      expect(liveLock.skills["skill-a"].path).toBe("skills/engineering/skill-a");
      expect(fs.readFileSync(path.join(root, ".agents/skills/engineering/skill-a/SKILL.md"), "utf8")).toBe("new content at new path");
      expect(fs.existsSync(path.join(root, ".agents/skills/design/skill-a"))).toBe(false);
      expect(() => validateLock(manifest, liveLock)).not.toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects promotion when the computed live lock fails validation", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "promote-test-"));
    try {
      const manifest: Manifest = {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/a.git",
            ref: "main",
            license: { name: "MIT", path: "LICENSE" },
          },
        },
        skills: {
          "skill-a": { source: "source-a", srcPath: "skills/skill-a", path: "skills/design/skill-a" },
        },
      };

      const stageLock: Lock = {
        version: 1,
        sources: {},
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "skills/skill-a",
            path: "skills/design/skill-a",
            commit: "new-commit",
            sha256: "new-a-sha",
          },
        },
      };

      writeJson(path.join(root, "config/skills/manifest.json"), manifest);
      writeJson(path.join(root, ".stage/stage-lock.json"), stageLock);
      writeStagedSkill(root, "skills/design/skill-a", "new skill A");

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code ?? 0}`);
      }) as never);

      expect(() => promoteStagedContent(root)).toThrow(/process\.exit:1/);
      expect(errorSpy.mock.calls.flat().join(" ")).toMatch(/references missing source/);
      expect(fs.existsSync(path.join(root, "config/skills/lock.json"))).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("rejects malformed stage-lock before any file mutation", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "promote-test-"));
    try {
      const manifest: Manifest = {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/a.git",
            ref: "main",
            license: { name: "MIT", path: "LICENSE" },
          },
        },
        skills: {
          "skill-a": { source: "source-a", srcPath: "skills/skill-a", path: "skills/design/skill-a" },
        },
      };

      const previousLock: Lock = {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "old-license-sha",
          },
        },
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "skills/skill-a",
            path: "skills/design/skill-a",
            commit: "old-commit",
            sha256: "old-a-sha",
          },
        },
      };

      writeJson(path.join(root, "config/skills/manifest.json"), manifest);
      writeJson(path.join(root, "config/skills/lock.json"), previousLock);
      writeJson(path.join(root, ".stage/stage-lock.json"), { version: 2, sources: {}, skills: {} });
      writeSkill(root, "skills/design/skill-a", "old skill A content");

      const lockPath = path.join(root, "config/skills/lock.json");
      const before = fs.readFileSync(lockPath, "utf8");

      const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code ?? 0}`);
      }) as never);

      expect(() => promoteStagedContent(root)).toThrow(/process\.exit:1/);
      expect(errorSpy.mock.calls.flat().join(" ")).toMatch(/Malformed stage-lock/);
      expect(fs.readFileSync(lockPath, "utf8")).toBe(before);
      expect(fs.existsSync(path.join(root, ".agents/skills/design/skill-a"))).toBe(true);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("leaves a rejected newly declared skill absent from lock", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "promote-test-"));
    try {
      const manifest: Manifest = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/a.git",
          ref: "main",
          license: { name: "MIT", path: "LICENSE" },
        },
      },
      skills: {
        "skill-a": { source: "source-a", srcPath: "skills/skill-a", path: "skills/design/skill-a" },
        "skill-b": { source: "source-a", srcPath: "skills/skill-b", path: "skills/design/skill-b" },
      },
    };

    const previousLock: Lock = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/a.git",
          ref: "main",
          license: "MIT",
          licensePath: ".agents/licenses/source-a-LICENSE",
          licenseSha256: "old-license-sha",
        },
      },
      skills: {
        "skill-a": {
          source: "source-a",
          srcPath: "skills/skill-a",
          path: "skills/design/skill-a",
          commit: "old-commit",
          sha256: "old-a-sha",
        },
      },
    };

    const stageLock: Lock = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/a.git",
          ref: "main",
          license: "MIT",
          licensePath: ".agents/licenses/source-a-LICENSE",
          licenseSha256: "new-license-sha",
        },
      },
      skills: {
        "skill-a": {
          source: "source-a",
          srcPath: "skills/skill-a",
          path: "skills/design/skill-a",
          commit: "new-commit",
          sha256: "new-a-sha",
        },
      },
    };

    writeJson(path.join(root, "config/skills/manifest.json"), manifest);
    writeJson(path.join(root, "config/skills/lock.json"), previousLock);
    writeJson(path.join(root, ".stage/stage-lock.json"), stageLock);

    writeSkill(root, "skills/design/skill-a", "old skill A");
    writeStagedSkill(root, "skills/design/skill-a", "new skill A");
    fs.mkdirSync(path.join(root, ".agents/licenses"), { recursive: true });
    fs.writeFileSync(path.join(root, ".agents/licenses/source-a-LICENSE"), "old-license");
    fs.mkdirSync(path.join(root, ".stage/skills/licenses"), { recursive: true });
    fs.writeFileSync(path.join(root, ".stage/skills/licenses/source-a-LICENSE"), "new-license");

    const liveLock = promoteStagedContent(root);

    expect(liveLock.skills["skill-b"]).toBeUndefined();
    expect(fs.existsSync(path.join(root, ".stage/stage-lock.json"))).toBe(false);
    expect(fs.existsSync(path.join(root, ".stage/skills"))).toBe(false);
    expect(() => validateLock(manifest, liveLock)).not.toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
