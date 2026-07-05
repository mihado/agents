import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { buildProgram } from "./main.js";

function makeTempRoot(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "agents-cli-smoke-"));
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe("agents CLI smoke", () => {
  it("reports the apm name and version", () => {
    const program = buildProgram();
    expect(program.name()).toBe("apm");
    expect(program.version()).toBe("0.1.0");
  });

  it("exposes a vendor subcommand with fetch, check, review, accept, reject, remove, audit", () => {
    const program = buildProgram();
    const subcommandNames = program.commands[0]?.commands.map((c) => c.name()) ?? [];
    expect(program.commands[0]?.name()).toBe("vendor");
    expect(subcommandNames).toEqual(
      expect.arrayContaining(["fetch", "check", "review", "accept", "reject", "remove", "audit"]),
    );
  });

  it("vendor reject and remove require a positional <skill-name>", () => {
    const program = buildProgram();
    const stderrWrites: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      stderrWrites.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as never);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    expect(() => program.parse(["node", "apm", "vendor", "reject"])).toThrow(/process\.exit:1/);
    expect(stderrWrites.join("")).toMatch(/skill-name/);

    stderrWrites.length = 0;
    expect(() => program.parse(["node", "apm", "vendor", "remove"])).toThrow(/process\.exit:1/);
    expect(stderrWrites.join("")).toMatch(/skill-name/);

    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("vendor reject against an empty project exits non-zero with no-stage error", () => {
    const root = makeTempRoot();
    try {
      const program = buildProgram({ root });
      vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code ?? 0}`);
      }) as never);

      expect(() => program.parse(["node", "apm", "vendor", "reject", "skill-a"])).toThrow(/process\.exit:1/);

      exitSpy.mockRestore();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("vendor --help lists every subcommand", () => {
    const program = buildProgram();
    const vendorHelp = program.commands[0]?.helpInformation() ?? "";
    for (const name of ["fetch", "check", "review", "accept", "reject", "remove", "audit"]) {
      expect(vendorHelp).toContain(name);
    }
  });
});
