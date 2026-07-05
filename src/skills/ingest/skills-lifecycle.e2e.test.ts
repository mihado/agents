import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import type { Lock } from "../inventory/lockfile.js";
import { validateLock } from "../inventory/lockfile.js";
import type { Manifest } from "../inventory/manifest.js";
import { promoteStagedContent } from "./promote.js";
import { readJson } from "../../core/commands.js";
import { removeSkillFromLock } from "./remove.js";
import { rejectSkillFromStage } from "./reject.js";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "skills-e2e-"));
}

function writeJson(filePath: string, value: unknown): void {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeManifest(root: string, manifest: Manifest): void {
  writeJson(path.join(root, "config/skills/manifest.json"), manifest);
}

function writeLiveLock(root: string, lock: Lock): void {
  writeJson(path.join(root, "config/skills/lock.json"), lock);
}

function writeStageLock(root: string, lock: Lock): void {
  writeJson(path.join(root, ".stage/stage-lock.json"), lock);
}

function writeLiveSkill(root: string, skillPath: string, files: Record<string, string>): void {
  const dir = path.join(root, ".agents", skillPath);
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const dest = path.join(dir, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

function writeStagedSkill(root: string, skillPath: string, files: Record<string, string>): void {
  const dir = path.join(root, ".stage/skills", skillPath.replace(/^skills\//, ""));
  fs.mkdirSync(dir, { recursive: true });
  for (const [name, content] of Object.entries(files)) {
    const dest = path.join(dir, name);
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.writeFileSync(dest, content);
  }
}

function writeLicense(root: string, licensePath: string, content: string): void {
  const liveLicensePath = path.join(root, ".agents", licensePath);
  fs.mkdirSync(path.dirname(liveLicensePath), { recursive: true });
  fs.writeFileSync(liveLicensePath, content);
}

function writeStagedLicense(root: string, licensePath: string, content: string): void {
  const stagedLicensePath = path.join(root, ".stage/skills/licenses", path.basename(licensePath));
  fs.mkdirSync(path.dirname(stagedLicensePath), { recursive: true });
  fs.writeFileSync(stagedLicensePath, content);
}

function readLiveSkillFile(root: string, skillPath: string, file: string): string {
  return fs.readFileSync(path.join(root, ".agents", skillPath, file), "utf8");
}

function fileExists(root: string, relativePath: string): boolean {
  return fs.existsSync(path.join(root, relativePath));
}

const TWO_SKILL_MANIFEST: Manifest = {
  version: 1,
  sources: {
    "source-a": {
      repository: "https://example.com/source-a.git",
      ref: "main",
      license: { name: "MIT", path: "LICENSE" },
    },
  },
  skills: {
    "skill-a": { source: "source-a", srcPath: "skills/skill-a", path: "skills/design/skill-a" },
    "skill-b": { source: "source-a", srcPath: "skills/skill-b", path: "skills/design/skill-b" },
  },
};

function oldLiveLock(): Lock {
  return {
    version: 1,
    sources: {
      "source-a": {
        repository: "https://example.com/source-a.git",
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
}

function stageLockWithOnlySkillB(): Lock {
  return {
    version: 1,
    sources: {
      "source-a": {
        repository: "https://example.com/source-a.git",
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
}

// --------------------------------------------------------------------
// Scenario 1: Reject one staged sibling, accept another from the same source
// --------------------------------------------------------------------
describe("Scenario 1: reject sibling, accept another from same source", () => {
  it("preserves the rejected sibling at old revision while promoting the accepted sibling at new revision", () => {
    const root = makeTempRoot();
    try {
      writeManifest(root, TWO_SKILL_MANIFEST);
    writeLiveLock(root, oldLiveLock());
    writeStageLock(root, stageLockWithOnlySkillB());

    writeLiveSkill(root, "skills/design/skill-a", { "SKILL.md": "old skill A content" });
    writeLiveSkill(root, "skills/design/skill-b", { "SKILL.md": "old skill B content", "obsolete.txt": "should be gone" });
    writeStagedSkill(root, "skills/design/skill-b", { "SKILL.md": "new skill B content" });
    writeLicense(root, ".agents/licenses/source-a-LICENSE", "old-license");
    writeStagedLicense(root, ".agents/licenses/source-a-LICENSE", "new-license");

    const liveLock = promoteStagedContent(root);

    expect(liveLock.skills["skill-a"].commit).toBe("old-commit");
    expect(liveLock.skills["skill-b"].commit).toBe("new-commit");

    expect(readLiveSkillFile(root, "skills/design/skill-a", "SKILL.md")).toBe("old skill A content");
    expect(readLiveSkillFile(root, "skills/design/skill-b", "SKILL.md")).toBe("new skill B content");
    expect(fileExists(root, ".agents/skills/design/skill-b/obsolete.txt")).toBe(false);
    expect(fileExists(root, ".stage/stage-lock.json")).toBe(false);
    expect(fileExists(root, ".stage/skills")).toBe(false);

    expect(() => validateLock(TWO_SKILL_MANIFEST, liveLock)).not.toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// --------------------------------------------------------------------
// Scenario 2: Reject a newly declared skill, accept the rest
// --------------------------------------------------------------------
describe("Scenario 2: reject newly declared skill, accept the rest", () => {
  it("leaves the rejected skill absent from lock and live tree, validates the subset", () => {
    const root = makeTempRoot();
    try {
      writeManifest(root, TWO_SKILL_MANIFEST);

    const previousLock: Lock = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/source-a.git",
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
          repository: "https://example.com/source-a.git",
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

    writeLiveLock(root, previousLock);
    writeStageLock(root, stageLock);

    writeLiveSkill(root, "skills/design/skill-a", { "SKILL.md": "old skill A" });
    writeStagedSkill(root, "skills/design/skill-a", { "SKILL.md": "new skill A" });
    writeLicense(root, ".agents/licenses/source-a-LICENSE", "old-license");
    writeStagedLicense(root, ".agents/licenses/source-a-LICENSE", "new-license");

    const liveLock = promoteStagedContent(root);

    expect(liveLock.skills["skill-a"]).toBeDefined();
    expect(liveLock.skills["skill-b"]).toBeUndefined();

    expect(readLiveSkillFile(root, "skills/design/skill-a", "SKILL.md")).toBe("new skill A");
    expect(fileExists(root, ".agents/skills/design/skill-b/SKILL.md")).toBe(false);
    expect(fileExists(root, ".stage/stage-lock.json")).toBe(false);
    expect(fileExists(root, ".stage/skills")).toBe(false);

    expect(() => validateLock(TWO_SKILL_MANIFEST, liveLock)).not.toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("rejectSkillFromStage", () => {
  it("removes a staged skill, updates stage-lock, and prunes the source license when no siblings remain", () => {
    const root = makeTempRoot();
    try {
      writeManifest(root, TWO_SKILL_MANIFEST);

      const stageLock: Lock = {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/source-a.git",
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
            commit: "new-commit-a",
            sha256: "new-a-sha",
          },
        },
      };

      writeStageLock(root, stageLock);
      writeStagedSkill(root, "skills/design/skill-a", { "SKILL.md": "candidate skill A" });
      writeStagedLicense(root, ".agents/licenses/source-a-LICENSE", "new-license");

      const result = rejectSkillFromStage(root, "skill-a");
      const updatedStageLock = readJson<Lock>(path.join(root, ".stage/stage-lock.json"));

      expect(result.skillName).toBe("skill-a");
      expect(result.remainingSkills).toBe(0);
      expect(result.cleanedSourceName).toBe("source-a");
      expect(updatedStageLock.skills["skill-a"]).toBeUndefined();
      expect(updatedStageLock.sources["source-a"]).toBeUndefined();
      expect(fileExists(root, ".stage/skills/design/skill-a/SKILL.md")).toBe(false);
      expect(fileExists(root, ".stage/skills/licenses/source-a-LICENSE")).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// --------------------------------------------------------------------
// Scenario 3: Remove a live skill without undeclaring it
// --------------------------------------------------------------------
describe("Scenario 3: remove live skill without undeclaring", () => {
  it("removes live content and lock entry but leaves manifest declaring the skill", () => {
    const root = makeTempRoot();
    try {
      writeManifest(root, TWO_SKILL_MANIFEST);

    const lock: Lock = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/source-a.git",
          ref: "main",
          license: "MIT",
          licensePath: ".agents/licenses/source-a-LICENSE",
          licenseSha256: "some-sha",
        },
      },
      skills: {
        "skill-a": {
          source: "source-a",
          srcPath: "skills/skill-a",
          path: "skills/design/skill-a",
          commit: "some-commit",
          sha256: "some-sha",
        },
      },
    };

    writeLiveLock(root, lock);
    writeLiveSkill(root, "skills/design/skill-a", { "SKILL.md": "skill A content" });
    writeLicense(root, ".agents/licenses/source-a-LICENSE", "license");

    const result = removeSkillFromLock(root, "skill-a");

    expect(result.skills["skill-a"]).toBeUndefined();
    expect(fileExists(root, ".agents/skills/design/skill-a/SKILL.md")).toBe(false);
    expect(fileExists(root, ".agents/skills/design/skill-a")).toBe(false);

    // manifest untouched
    const manifest = readJson<Manifest>(path.join(root, "config/skills/manifest.json"));
    expect(manifest.skills["skill-a"]).toBeDefined();

    expect(() => validateLock(manifest, result)).not.toThrow();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

// --------------------------------------------------------------------
// Scenario 4: Promotion replaces a live skill directory exactly
// --------------------------------------------------------------------
describe("Scenario 4: promotion replaces live skill directory exactly", () => {
  it("removes stale files that existed in the previous live skill but not in the staged version", () => {
    const root = makeTempRoot();
    try {
      writeManifest(root, TWO_SKILL_MANIFEST);

    const previousLock: Lock = {
      version: 1,
      sources: {
        "source-a": {
          repository: "https://example.com/source-a.git",
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
          repository: "https://example.com/source-a.git",
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

    writeLiveLock(root, previousLock);
    writeStageLock(root, stageLock);

    writeLiveSkill(root, "skills/design/skill-a", {
      "SKILL.md": "old skill A",
      "legacy.cfg": "old config",
      "nested/deprecated.sh": "old helper",
    });
    writeStagedSkill(root, "skills/design/skill-a", {
      "SKILL.md": "new skill A",
      "LICENSE": "MIT",
    });
    writeLicense(root, ".agents/licenses/source-a-LICENSE", "old-license");
    writeStagedLicense(root, ".agents/licenses/source-a-LICENSE", "new-license");

    promoteStagedContent(root);

    expect(readLiveSkillFile(root, "skills/design/skill-a", "SKILL.md")).toBe("new skill A");
    expect(fileExists(root, ".agents/skills/design/skill-a/LICENSE")).toBe(true);
    expect(fileExists(root, ".agents/skills/design/skill-a/legacy.cfg")).toBe(false);
    expect(fileExists(root, ".agents/skills/design/skill-a/nested/deprecated.sh")).toBe(false);
    expect(fileExists(root, ".agents/skills/design/skill-a/nested")).toBe(false);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});
