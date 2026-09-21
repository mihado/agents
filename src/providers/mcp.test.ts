import { describe, it, expect, vi, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installMcp, checkMcp } from "./mcp.js";
import { platformMcpArgs } from "./shared/mcp-args.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../..");

afterEach(() => {
  vi.restoreAllMocks();
});

function withoutTools(fn: () => void): void {
  const savedPath = process.env.PATH;
  const savedCodex = process.env.CODEX_CLI_PATH;
  const savedClaude = process.env.CLAUDE_CLI_PATH;
  const emptyDir = fs.mkdtempSync(path.join(os.tmpdir(), "agents-no-tools-"));
  process.env.PATH = emptyDir;
  delete process.env.CODEX_CLI_PATH;
  delete process.env.CLAUDE_CLI_PATH;
  try {
    fn();
  } finally {
    if (savedPath === undefined) delete process.env.PATH;
    else process.env.PATH = savedPath;
    if (savedCodex === undefined) delete process.env.CODEX_CLI_PATH;
    else process.env.CODEX_CLI_PATH = savedCodex;
    if (savedClaude === undefined) delete process.env.CLAUDE_CLI_PATH;
    else process.env.CLAUDE_CLI_PATH = savedClaude;
    fs.rmSync(emptyDir, { recursive: true, force: true });
  }
}

describe("platformMcpArgs", () => {
  const chrome = {
    type: "stdio" as const,
    command: "npx",
    args: ["-y", "chrome-devtools-mcp@latest", "--isolated"],
  };

  it("keeps Chrome headed on macOS", () => {
    expect(platformMcpArgs(chrome, "darwin")).toEqual(["-y", "chrome-devtools-mcp@latest", "--isolated"]);
  });

  it("forces Chrome headless off macOS", () => {
    expect(platformMcpArgs(chrome, "linux")).toEqual(["-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"]);
  });

  it("does not duplicate an explicit --headless", () => {
    const headed = { ...chrome, args: [...chrome.args, "--headless"] };
    expect(platformMcpArgs(headed, "linux")).toEqual(["-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"]);
  });

  it("leaves non-Chrome servers alone", () => {
    const other = { type: "stdio" as const, command: "npx", args: ["-y", "something-else"] };
    expect(platformMcpArgs(other, "linux")).toEqual(["-y", "something-else"]);
  });

  it("returns no args for remote servers", () => {
    expect(platformMcpArgs({ type: "remote", url: "https://example.com/mcp" }, "linux")).toEqual([]);
  });
});

describe("mcp without codex or claude", () => {
  it("installMcp skips instead of failing", () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(String(msg));
    });
    withoutTools(() => {
      expect(() => installMcp(root)).not.toThrow();
    });
    expect(logs.join("\n")).toContain("skip");
  });

  it("checkMcp skips instead of failing", () => {
    const logs: string[] = [];
    vi.spyOn(console, "log").mockImplementation((msg: string) => {
      logs.push(String(msg));
    });
    withoutTools(() => {
      expect(() => checkMcp(root)).not.toThrow();
    });
    expect(logs.join("\n")).toContain("skip");
  });
});
