import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import type { Finding } from "../types.js";
import { readBaseline, writeBaseline, mergeBaseline, isSuppressed } from "./baseline.js";

describe("readBaseline", () => {
  it("returns empty structure when file does not exist", () => {
    const result = readBaseline("/nonexistent/path.json");
    expect(result).toEqual({ rules: [], fingerprints: [] });
  });

  it("reads new format with rules and fingerprints", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
    const filePath = path.join(tmpDir, "baseline.json");
    const data = {
      version: 1,
      rules: [{ rule_id: "subprocess", file_glob: "scripts/*" }],
      fingerprints: [
        { hash: "abc123", rule_id: "test", file: "a.md", reason: "Accepted 2026-07-05" },
      ],
    };
    fs.writeFileSync(filePath, JSON.stringify(data));

    const result = readBaseline(filePath);
    expect(result.rules).toHaveLength(1);
    expect(result.fingerprints).toHaveLength(1);
    expect(result.fingerprints[0].hash).toBe("abc123");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("migrates legacy format (accepted array)", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
    const filePath = path.join(tmpDir, "baseline.json");
    const data = {
      accepted: [
        { fingerprint: "abc123", file: "a.md", label: "test", snippet: "x", acceptedAt: "2026-01-01" },
      ],
    };
    fs.writeFileSync(filePath, JSON.stringify(data));

    const result = readBaseline(filePath);
    expect(result.rules).toEqual([]);
    expect(result.fingerprints).toHaveLength(1);
    expect(result.fingerprints[0].hash).toBe("abc123");
    expect(result.fingerprints[0].rule_id).toBe("test");

    fs.rmSync(tmpDir, { recursive: true });
  });

  it("throws on invalid JSON", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
    const filePath = path.join(tmpDir, "baseline.json");
    fs.writeFileSync(filePath, "not json");

    expect(() => readBaseline(filePath)).toThrow(/cannot read/);

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("writeBaseline", () => {
  it("writes entries sorted by hash", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
    const filePath = path.join(tmpDir, "baseline.json");

    const baseline = {
      rules: [],
      fingerprints: [
        { hash: "zzz", rule_id: "l", file: "b.md", reason: "r" },
        { hash: "aaa", rule_id: "l", file: "a.md", reason: "r" },
      ],
    };
    writeBaseline(filePath, baseline);

    const written = JSON.parse(fs.readFileSync(filePath, "utf8"));
    expect(written.version).toBe(1);
    expect(written.fingerprints[0].hash).toBe("aaa");
    expect(written.fingerprints[1].hash).toBe("zzz");

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("mergeBaseline", () => {
  it("adds new findings to existing baseline", () => {
    const existing = {
      rules: [],
      fingerprints: [{ hash: "existing1", rule_id: "l", file: "a.md", reason: "r" }],
    };
    const newFindings = [
      { fingerprint: "new1", file: "b.md", label: "l2", snippet: "s2" },
    ];

    const merged = mergeBaseline(existing, newFindings as Finding[]);
    expect(merged.fingerprints).toHaveLength(2);
    expect(merged.fingerprints.some((e) => e.hash === "existing1")).toBe(true);
    expect(merged.fingerprints.some((e) => e.hash === "new1")).toBe(true);
  });

  it("deduplicates by hash", () => {
    const existing = {
      rules: [],
      fingerprints: [{ hash: "same", rule_id: "l", file: "a.md", reason: "r" }],
    };
    const newFindings = [
      { fingerprint: "same", file: "a.md", label: "l", snippet: "s" },
    ];

    const merged = mergeBaseline(existing, newFindings as Finding[]);
    expect(merged.fingerprints).toHaveLength(1);
  });

  it("adds reason to new entries", () => {
    const merged = mergeBaseline({ rules: [], fingerprints: [] }, [
      { fingerprint: "fp1", file: "x.md", label: "l", snippet: "s" },
    ] as Finding[], "Initial audit");
    expect(merged.fingerprints[0].reason).toBe("Initial audit");
  });

  it("preserves rules", () => {
    const existing = {
      rules: [{ rule_id: "subprocess", file_glob: "scripts/*" }],
      fingerprints: [],
    };
    const merged = mergeBaseline(existing, []);
    expect(merged.rules).toHaveLength(1);
  });
});

describe("isSuppressed", () => {
  it("suppresses by fingerprint match", () => {
    const baseline = {
      rules: [],
      fingerprints: [{ hash: "abc123", rule_id: "test", file: "a.md", reason: "r" }],
    };
    const finding = { fingerprint: "abc123", file: "a.md", label: "test" };
    expect(isSuppressed(baseline, finding as Finding)).toBe(true);
  });

  it("does not suppress unknown fingerprint", () => {
    const baseline = { rules: [], fingerprints: [] };
    const finding = { fingerprint: "unknown", file: "a.md", label: "test" };
    expect(isSuppressed(baseline, finding as Finding)).toBe(false);
  });

  it("suppresses by rule_id match (no file glob)", () => {
    const baseline = {
      rules: [{ rule_id: "subprocess" }],
      fingerprints: [],
    };
    const finding = { fingerprint: "xyz", file: "scripts/build.py", label: "subprocess" };
    expect(isSuppressed(baseline, finding as Finding)).toBe(true);
  });

  it("suppresses by rule_id + file glob", () => {
    const baseline = {
      rules: [{ rule_id: "child_process", file_glob: ".agents/skills/design/*" }],
      fingerprints: [],
    };
    const finding = { fingerprint: "xyz", file: ".agents/skills/design/impeccable/scripts/live.mjs", label: "child_process" };
    expect(isSuppressed(baseline, finding as Finding)).toBe(true);
  });

  it("does not suppress when file glob doesn't match", () => {
    const baseline = {
      rules: [{ rule_id: "child_process", file_glob: ".agents/skills/engineering/*" }],
      fingerprints: [],
    };
    const finding = { fingerprint: "xyz", file: ".agents/skills/design/impeccable/scripts/live.mjs", label: "child_process" };
    expect(isSuppressed(baseline, finding as Finding)).toBe(false);
  });
});
