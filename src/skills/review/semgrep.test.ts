import { describe, it, expect } from "vitest";
import { normalizeSemgrepResults } from "./semgrep.js";

describe("normalizeSemgrepResults", () => {
  it("normalizes semgrep JSON into the scanner finding shape", () => {
    const findings = normalizeSemgrepResults("/repo", {
      results: [
        {
          check_id: "child_process",
          path: "/repo/.agents/skills/design/impeccable/scripts/live.mjs",
          start: { line: 20 },
          extra: {
            lines: 'import { execSync } from "node:child_process";',
          },
        },
      ],
    });

    expect(findings).toHaveLength(1);

    const f = findings[0];
    expect(f.file).toBe(".agents/skills/design/impeccable/scripts/live.mjs");
    expect(f.label).toBe("child_process");
    expect(f.lineNum).toBe(20);
    expect(f.fingerprint).toHaveLength(16);
  });

  it("falls back to the semgrep message when no source snippet is present", () => {
    const findings = normalizeSemgrepResults("/repo", {
      results: [
        {
          check_id: "subprocess",
          path: ".agents/skills/design/kami/scripts/build.py",
          start: { line: 111 },
          extra: {
            message: "subprocess",
          },
        },
      ],
    });

    expect(findings[0].snippet).toBe("subprocess");
  });
});
