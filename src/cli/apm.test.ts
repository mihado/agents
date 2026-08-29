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

describe("apm CLI smoke", () => {
  it("reports the apm name and version", () => {
    const program = buildProgram();
    expect(program.name()).toBe("apm");
    expect(program.version()).toBe("0.1.0");
  });

  it("exposes skills, providers, mcp, install, doctor, and check as top-level commands", () => {
    const program = buildProgram();
    const topLevel = program.commands.map((c) => c.name());
    expect(topLevel).toEqual(
      expect.arrayContaining(["skills", "providers", "mcp", "install", "doctor", "check"]),
    );
  });

  it("skills exposes fetch, check, review, accept, reject, remove, audit", () => {
    const program = buildProgram();
    const skills = program.commands.find((c) => c.name() === "skills");
    const subcommandNames = skills?.commands.map((c) => c.name()) ?? [];
    expect(subcommandNames).toEqual(
      expect.arrayContaining(["fetch", "check", "review", "accept", "reject", "remove", "audit"]),
    );
  });

  it("mcp and providers each expose install and check", () => {
    const program = buildProgram();
    const mcp = program.commands.find((c) => c.name() === "mcp");
    const providers = program.commands.find((c) => c.name() === "providers");
    expect(mcp?.commands.map((c) => c.name()).sort()).toEqual(["check", "install"]);
    expect(providers?.commands.map((c) => c.name()).sort()).toEqual(["check", "install"]);
  });

  it("skills reject and remove require a positional <skill-name>", () => {
    const program = buildProgram();
    const stderrWrites: string[] = [];
    const stderrSpy = vi.spyOn(process.stderr, "write").mockImplementation(((chunk: string | Uint8Array) => {
      stderrWrites.push(typeof chunk === "string" ? chunk : new TextDecoder().decode(chunk));
      return true;
    }) as never);
    const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
      throw new Error(`process.exit:${code ?? 0}`);
    }) as never);

    expect(() => program.parse(["node", "apm", "skills", "reject"])).toThrow(/process\.exit:1/);
    expect(stderrWrites.join("")).toMatch(/skill-name/);

    stderrWrites.length = 0;
    expect(() => program.parse(["node", "apm", "skills", "remove"])).toThrow(/process\.exit:1/);
    expect(stderrWrites.join("")).toMatch(/skill-name/);

    exitSpy.mockRestore();
    stderrSpy.mockRestore();
  });

  it("skills reject against an empty project exits non-zero with no-stage error", () => {
    const root = makeTempRoot();
    try {
      const program = buildProgram({ root });
      vi.spyOn(process.stderr, "write").mockImplementation(() => true);
      vi.spyOn(console, "error").mockImplementation(() => {});
      const exitSpy = vi.spyOn(process, "exit").mockImplementation(((code?: number) => {
        throw new Error(`process.exit:${code ?? 0}`);
      }) as never);

      expect(() => program.parse(["node", "apm", "skills", "reject", "skill-a"])).toThrow(/process\.exit:1/);

      exitSpy.mockRestore();
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });

  it("skills help does not expose the removed --accept option", () => {
    const program = buildProgram();
    const skills = program.commands.find((c) => c.name() === "skills");
    const skillsHelp = skills?.helpInformation() ?? "";
    expect(skillsHelp).not.toContain("--accept");
  });

  it("apm --help lists every top-level command", () => {
    const program = buildProgram();
    const help = program.helpInformation();
    for (const name of ["skills", "providers", "mcp", "install", "doctor", "check", "link"]) {
      expect(help).toContain(name);
    }
  });
});
