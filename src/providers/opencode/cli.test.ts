import { describe, it, expect, vi, beforeAll, afterAll, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { installCliConfig, checkCliConfig, getCliConfigPath } from "./cli.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../../..");
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-cli-test-"));
const tempConfigHome = path.join(tempRoot, ".config");
const configPath = path.join(tempConfigHome, "opencode", "cli.json");
const savedXdg = process.env.XDG_CONFIG_HOME;

function manifestContent(): Record<string, unknown> {
  return JSON.parse(
    fs.readFileSync(path.join(root, "config", "providers", "opencode", "cli.json"), "utf8"),
  );
}

beforeAll(() => {
  process.env.XDG_CONFIG_HOME = tempConfigHome;
});

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  if (savedXdg === undefined) delete process.env.XDG_CONFIG_HOME;
  else process.env.XDG_CONFIG_HOME = savedXdg;
});

beforeEach(() => {
  vi.spyOn(console, "log").mockImplementation(() => {});
  vi.spyOn(console, "error").mockImplementation(() => {});
});

afterEach(() => {
  vi.restoreAllMocks();
  fs.rmSync(configPath, { force: true });
});

describe("getCliConfigPath()", () => {
  it("returns cli.json under XDG_CONFIG_HOME", () => {
    expect(getCliConfigPath()).toBe(configPath);
  });
});

describe("installCliConfig()/checkCliConfig()", () => {
  it("writes the manifest content on first install", () => {
    installCliConfig(root);
    expect(JSON.parse(fs.readFileSync(configPath, "utf8"))).toEqual(manifestContent());
  });

  it("is idempotent: second install reports ok", () => {
    const log: string[] = [];
    vi.spyOn(console, "log").mockImplementation((...args: unknown[]) => {
      log.push(args.join(" "));
    });
    installCliConfig(root);
    installCliConfig(root);
    expect(log.join("\n")).toContain("ok      cli.json");
  });

  it("preserves the session.background keybind from the manifest", () => {
    installCliConfig(root);
    const config = JSON.parse(fs.readFileSync(configPath, "utf8")) as {
      keybinds?: Record<string, string>;
    };
    expect(config.keybinds?.["session.background"]).toBe("ctrl+z");
  });

  it("check passes after install", () => {
    installCliConfig(root);
    expect(checkCliConfig(root)).toBe(true);
  });

  it("check fails when the live file is missing", () => {
    expect(checkCliConfig(root)).toBe(false);
  });

  it("check fails on drift and install restores", () => {
    installCliConfig(root);
    const drifted = { ...(manifestContent() as Record<string, unknown>), animations: false };
    fs.writeFileSync(configPath, JSON.stringify(drifted, null, 2) + "\n");
    expect(checkCliConfig(root)).toBe(false);

    installCliConfig(root);
    expect(checkCliConfig(root)).toBe(true);
  });
});
