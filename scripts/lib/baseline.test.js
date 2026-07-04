import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { readBaseline, writeBaseline, mergeBaseline } from "./baseline.js";

describe("readBaseline", () => {
  it("returns empty array when file does not exist", () => {
    const result = readBaseline("/nonexistent/path.json");
    expect(result).toEqual([]);
  });

  it("reads accepted entries from a valid baseline file", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
    const filePath = path.join(tmpDir, "baseline.json");
    const data = {
      accepted: [
        { fingerprint: "abc123", file: "a.md", label: "test", snippet: "x", acceptedAt: "2026-01-01" },
      ],
    };
    fs.writeFileSync(filePath, JSON.stringify(data));

    const result = readBaseline(filePath);
    expect(result).toHaveLength(1);
    expect(result[0].fingerprint).toBe("abc123");

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
  it("writes entries sorted by fingerprint", () => {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "baseline-test-"));
    const filePath = path.join(tmpDir, "baseline.json");

    const entries = [
      { fingerprint: "zzz", file: "b.md", label: "l", snippet: "s", acceptedAt: "2026-01-01" },
      { fingerprint: "aaa", file: "a.md", label: "l", snippet: "s", acceptedAt: "2026-01-01" },
    ];
    writeBaseline(filePath, entries);

    const written = JSON.parse(fs.readFileSync(filePath, "utf8"));
    expect(written.accepted[0].fingerprint).toBe("aaa");
    expect(written.accepted[1].fingerprint).toBe("zzz");

    fs.rmSync(tmpDir, { recursive: true });
  });
});

describe("mergeBaseline", () => {
  it("adds new findings to existing baseline", () => {
    const existing = [
      { fingerprint: "existing1", file: "a.md", label: "l", snippet: "s", acceptedAt: "2026-01-01" },
    ];
    const newFindings = [
      { fingerprint: "new1", file: "b.md", label: "l2", snippet: "s2" },
    ];

    const merged = mergeBaseline(existing, newFindings);
    expect(merged).toHaveLength(2);
    expect(merged.some((e) => e.fingerprint === "existing1")).toBe(true);
    expect(merged.some((e) => e.fingerprint === "new1")).toBe(true);
  });

  it("deduplicates by fingerprint", () => {
    const existing = [
      { fingerprint: "same", file: "a.md", label: "l", snippet: "s", acceptedAt: "2026-01-01" },
    ];
    const newFindings = [
      { fingerprint: "same", file: "a.md", label: "l", snippet: "s" },
    ];

    const merged = mergeBaseline(existing, newFindings);
    expect(merged).toHaveLength(1);
  });

  it("adds acceptedAt to new entries", () => {
    const merged = mergeBaseline([], [
      { fingerprint: "fp1", file: "x.md", label: "l", snippet: "s" },
    ]);
    expect(merged[0].acceptedAt).toBeTruthy();
    expect(merged[0].acceptedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});
