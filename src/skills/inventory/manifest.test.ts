import { describe, it, expect } from "vitest";
import { validateManifest, type Manifest } from "./manifest.js";

function base(): Manifest {
  return {
    version: 1,
    sources: {
      "source-a": {
        repository: "https://example.com/source-a.git",
        ref: "main",
        license: { name: "MIT", path: "LICENSE" },
      },
    },
    skills: {},
  };
}

describe("validateManifest upstream paths", () => {
  it("accepts repo-root skills with srcPath '.'", () => {
    const manifest = base();
    manifest.skills["root-skill"] = { source: "source-a", srcPath: ".", path: "skills/engineering/root-skill" };
    expect(() => validateManifest(manifest)).not.toThrow();
  });

  it("still rejects parent traversal", () => {
    const manifest = base();
    manifest.skills["evil"] = { source: "source-a", srcPath: "../evil", path: "skills/engineering/evil" };
    expect(() => validateManifest(manifest)).toThrow();
  });
});
