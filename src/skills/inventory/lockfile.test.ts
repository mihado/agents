import { describe, it, expect, vi, afterEach } from "vitest";
import type { Manifest } from "./manifest.js";
import { checkLockShape, validateLock, validateSkillPath, validateStageLock } from "./lockfile.js";

const manifest: Manifest = {
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

afterEach(() => {
  vi.restoreAllMocks();
});

function expectValidationFailure(action: () => void, pattern: RegExp): void {
  const errorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
  const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
    throw new Error(`process.exit:${code ?? 0}`);
  }) as never);

  expect(action).toThrow(/process\.exit:1/);
  expect(errorSpy).toHaveBeenCalled();
  expect(errorSpy.mock.calls.flat().join(" ")).toMatch(pattern);

  exitSpy.mockRestore();
  errorSpy.mockRestore();
}

describe("checkLockShape", () => {
  it("accepts version 1 lock shape", () => {
    expect(checkLockShape({ version: 1, sources: {}, skills: {} })).toBe(true);
  });

  it("rejects unknown lock version", () => {
    expect(checkLockShape({ version: 2, sources: {}, skills: {} })).toBe(false);
  });
});

describe("validateSkillPath", () => {
  it("accepts a well-formed skill path", () => {
    expect(() => validateSkillPath("skills/design/example", "test")).not.toThrow();
  });

  it("rejects absolute paths", () => {
    expectValidationFailure(() => validateSkillPath("/etc/passwd", "test"), /unsafe skill path/);
  });

  it("rejects paths that do not start with skills/", () => {
    expectValidationFailure(() => validateSkillPath("other/example", "test"), /unsafe skill path/);
  });

  it("rejects paths containing ..", () => {
    expectValidationFailure(() => validateSkillPath("skills/../escape", "test"), /unsafe skill path/);
  });

  it("rejects paths with a trailing slash", () => {
    expectValidationFailure(() => validateSkillPath("skills/design/example/", "test"), /unsafe skill path/);
  });
});

describe("validateStageLock", () => {
  it("accepts a well-formed stage lock", () => {
    expect(() =>
      validateStageLock({
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/source-a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "sha-license",
          },
        },
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "skills/skill-a",
            path: "skills/design/skill-a",
            commit: "abc",
            sha256: "def",
          },
        },
      }),
    ).not.toThrow();
  });

  it("rejects a stage lock with a null skill entry", () => {
    expectValidationFailure(
      () => validateStageLock({ version: 1, sources: {}, skills: { "skill-a": null } }),
      /Malformed stage-lock\.json/,
    );
  });

  it("rejects a stage lock with a skill missing required fields", () => {
    expectValidationFailure(
      () =>
        validateStageLock({
          version: 1,
          sources: {
            "source-a": {
              repository: "https://example.com/source-a.git",
              ref: "main",
              license: "MIT",
              licensePath: ".agents/licenses/source-a-LICENSE",
              licenseSha256: "sha-license",
            },
          },
          skills: {
            "skill-a": { source: "source-a" },
          },
        }),
      /missing required fields/,
    );
  });

  it("rejects a stage lock with a source missing required fields", () => {
    expectValidationFailure(
      () =>
        validateStageLock({
          version: 1,
          sources: { "source-a": { repository: "https://example.com/source-a.git" } },
          skills: {},
        }),
      /missing required fields/,
    );
  });
});

describe("validateLock", () => {
  it("allows manifest-declared skills to be absent from lock", () => {
    expect(() =>
      validateLock(manifest, {
        version: 1,
        sources: {},
        skills: {},
      }),
    ).not.toThrow();
  });

  it("allows mixed commits for siblings from the same source", () => {
    expect(() =>
      validateLock(manifest, {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/source-a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "sha-license",
          },
        },
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "skills/skill-a",
            path: "skills/design/skill-a",
            commit: "old-commit",
            sha256: "sha-a",
          },
          "skill-b": {
            source: "source-a",
            srcPath: "skills/skill-b",
            path: "skills/design/skill-b",
            commit: "new-commit",
            sha256: "sha-b",
          },
        },
      }),
    ).not.toThrow();
  });

  it("rejects undeclared lock skills", () => {
    expectValidationFailure(() =>
      validateLock(manifest, {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/source-a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "sha-license",
          },
        },
        skills: {
          ghost: {
            source: "source-a",
            srcPath: "skills/ghost",
            path: "skills/design/ghost",
            commit: "x",
            sha256: "y",
          },
        },
      }),
    /not declared in manifest/);
  });

  it("rejects drifted path or srcPath for lock skills", () => {
    expectValidationFailure(() =>
      validateLock(manifest, {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/source-a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "sha-license",
          },
        },
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "wrong/path",
            path: "skills/design/wrong",
            commit: "x",
            sha256: "y",
          },
        },
      }),
    /stale or incomplete lock skill/);
  });

  it("rejects skill referencing missing source", () => {
    expectValidationFailure(() =>
      validateLock(manifest, {
        version: 1,
        sources: {},
        skills: {
          "skill-a": {
            source: "source-a",
            srcPath: "skills/skill-a",
            path: "skills/design/skill-a",
            commit: "x",
            sha256: "y",
          },
        },
      }),
    /references missing source/);
  });

  it("rejects orphaned sources", () => {
    expectValidationFailure(() =>
      validateLock(manifest, {
        version: 1,
        sources: {
          "source-a": {
            repository: "https://example.com/source-a.git",
            ref: "main",
            license: "MIT",
            licensePath: ".agents/licenses/source-a-LICENSE",
            licenseSha256: "sha-license",
          },
        },
        skills: {},
      }),
    /has no referencing skill/);
  });
});
