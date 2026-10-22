import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { getOpenCodeConfigPath, readOpenCodeConfig, writeOpenCodeConfig, toOpenCodeMcp, toOpenCodeProvider } from "./config.js";

const root = path.resolve(fileURLToPath(import.meta.url), "../../../..");

const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "opencode-config-test-"));
const tempConfigHome = path.join(tempRoot, ".config");
const configPath = path.join(tempConfigHome, "opencode", "opencode.jsonc");

beforeAll(() => {
  process.env.XDG_CONFIG_HOME = tempConfigHome;
});

afterAll(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  delete process.env.XDG_CONFIG_HOME;
});

function seed(content: string): void {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, content);
}

function unseed(): void {
  try {
    fs.unlinkSync(configPath);
  } catch { /* ok */ }
}

describe("getOpenCodeConfigPath()", () => {
  it("returns path under XDG_CONFIG_HOME", () => {
    expect(getOpenCodeConfigPath()).toBe(configPath);
  });
});

describe("readOpenCodeConfig()", () => {
  it("returns {} when no config file exists", () => {
    unseed();
    expect(readOpenCodeConfig()).toEqual({});
  });

  it("parses valid JSON", () => {
    seed('{"key":"value"}');
    expect(readOpenCodeConfig()).toEqual({ key: "value" });
  });

  it("strips // single-line comments", () => {
    seed('{\n  // a comment\n  "key": "value"\n}');
    expect(readOpenCodeConfig()).toEqual({ key: "value" });
  });

  it("strips /* */ multi-line comments", () => {
    seed("{\n  /* block\n     comment */\n  \"key\": \"value\"\n}");
    expect(readOpenCodeConfig()).toEqual({ key: "value" });
  });

  it("preserves // inside strings (URLs)", () => {
    seed('{ "url": "https://example.com/path" }');
    expect(readOpenCodeConfig()).toEqual({ url: "https://example.com/path" });
  });

  it("fails loudly on malformed JSON instead of discarding the config", () => {
    seed("not json");
    expect(() => readOpenCodeConfig()).toThrow();
  });

});

describe("writeOpenCodeConfig()", () => {
  it("creates directory and writes valid JSON", () => {
    const data = { provider: { c9: { name: "test" } } };
    writeOpenCodeConfig(data);
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(data);
  });

  it("overwrites existing config", () => {
    seed('{ "old": true }');
    writeOpenCodeConfig({ fresh: true });
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    expect(parsed).toEqual({ fresh: true });
  });
});

describe("roundtrip", () => {
  it("preserves data through write -> read", () => {
    const config: Record<string, unknown> = {
      provider: { c9: { models: { "cmc/deepseek": { reasoning: true } } } },
      mcp: { context7: { type: "remote", url: "https://example.com" } },
    };
    writeOpenCodeConfig(config);
    expect(readOpenCodeConfig()).toEqual(config);
  });

  it("write does not persist JSONC comments", () => {
    seed('{ /* will be lost */ "key": "value" }');
    const config = readOpenCodeConfig();
    writeOpenCodeConfig(config);
    const raw = fs.readFileSync(configPath, "utf8");
    expect(raw).not.toContain("will be lost");
  });
});

describe("toOpenCodeMcp()", () => {
  const chrome = {
    type: "stdio" as const,
    command: "npx",
    args: ["-y", "chrome-devtools-mcp@latest", "--isolated"],
  };

  it("keeps Chrome DevTools headed on macOS", () => {
    expect(toOpenCodeMcp(chrome, "darwin")).toEqual({
      type: "local",
      command: ["npx", "-y", "chrome-devtools-mcp@latest", "--isolated"],
      enabled: true,
    });
  });

  it("forces Chrome DevTools headless on non-macOS hosts", () => {
    expect(toOpenCodeMcp(chrome, "linux")).toEqual({
      type: "local",
      command: ["npx", "-y", "chrome-devtools-mcp@latest", "--isolated", "--headless"],
      enabled: true,
    });
  });

  it("maps Better Auth to its remote documentation server", () => {
    expect(toOpenCodeMcp({
      type: "remote",
      url: "https://mcp.better-auth.com/mcp",
    })).toEqual({
      type: "remote",
      url: "https://mcp.better-auth.com/mcp",
      enabled: true,
    });
  });
});

describe("toOpenCodeProvider()", () => {
  it("syncs an options overlay verbatim for built-in providers", () => {
    expect(toOpenCodeProvider("commandcode", {
      options: { headers: { "x-cmd-zdr": "1" } },
    })).toEqual({ options: { headers: { "x-cmd-zdr": "1" } } });
  });

  it("merges declared options into full provider builds", () => {
    const built = toOpenCodeProvider("c9", {
      baseURL: "https://c9.rter.cc/v1",
      headers: { "x-a": "1" },
      options: { headers: { "x-b": "2" } },
      models: { m: { name: "M" } },
    }) as { options: Record<string, unknown> };
    expect(built.options.headers).toEqual({ "x-a": "1", "x-b": "2" });
    expect(built.options.baseURL).toBe("https://c9.rter.cc/v1");
  });
});

describe("integration: apm providers", () => {
  const apmCli = path.join(root, "dist", "cli", "main.js");

  beforeAll(() => {
    execSync("pnpm build", { cwd: root, stdio: "pipe" });
  });

  it("apm providers install then check passes", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).toBe(0);
  });

  it("install writes the manifest v2 plugins list and prunes removals", () => {
    seed(JSON.stringify({ plugins: ["stale-plugin"] }));
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);
    expect(install.stdout).toContain("removed plugins stale-plugin");
    expect(install.stdout).toContain("linked  plugins opencode-anthropic-login-via-cli@1.7.0");

    const config = readOpenCodeConfig();
    expect(config.plugins).toEqual(["opencode-anthropic-login-via-cli@1.7.0"]);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).toBe(0);
  });

  it("check fails when the local v2 plugins list drifts from the manifest", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = readOpenCodeConfig();
    config.plugins = [...((config.plugins as string[]) ?? []), "stale-plugin"];
    writeOpenCodeConfig(config);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).not.toBe(0);
    expect(check.stderr).toContain("not in providers.json");

    // restore for subsequent tests
    const reinstall = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(reinstall.status).toBe(0);
  });

  it("install writes manifest provider overlays and check verifies them", () => {
    seed(JSON.stringify({ provider: {} }));
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);
    expect(install.stdout).toContain("linked  provider commandcode");

    const config = readOpenCodeConfig();
    expect((config.provider as Record<string, unknown>).commandcode).toEqual({
      options: { headers: { "x-cmd-zdr": "1" } },
    });

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).toBe(0);
  });

  it("check fails when a provider overlay drifts from the manifest", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = readOpenCodeConfig();
    const provider = config.provider as Record<string, Record<string, unknown>>;
    provider.commandcode = { options: { headers: {} } };
    writeOpenCodeConfig(config);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).not.toBe(0);
    expect(check.stderr).toContain("provider commandcode config differs");

    // restore for subsequent tests
    const reinstall = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(reinstall.status).toBe(0);
  });

  it("installs operator and prunes the managed typist symlink", () => {
    const agentsDir = path.join(tempConfigHome, "opencode", "agents");
    const legacyTarget = path.join(root, "config", "providers", "opencode", "agents", "typist.md");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.symlinkSync(legacyTarget, path.join(agentsDir, "typist.md"));

    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const operatorPath = path.join(agentsDir, "operator.md");
    expect(fs.lstatSync(operatorPath).isSymbolicLink()).toBe(true);
    expect(fs.readlinkSync(operatorPath)).toBe(path.join(root, "config", "providers", "opencode", "agents", "operator.md"));
    expect(fs.existsSync(path.join(agentsDir, "typist.md"))).toBe(false);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).toBe(0);
  });

  it("installs shorthand commands for managed skills", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const commandsDir = path.join(tempConfigHome, "opencode", "commands");
    for (const name of [
      "show-me",
      "thermos",
      "thermo-nuclear-review",
      "thermo-nuclear-code-quality-review",
      "browser-testing-with-devtools",
      "improve",
      "quality",
      "simplify",
    ]) {
      const commandPath = path.join(commandsDir, `${name}.md`);
      expect(fs.lstatSync(commandPath).isSymbolicLink()).toBe(true);
      expect(fs.readFileSync(commandPath, "utf8")).not.toContain("agent:");
    }
  });

  it("provider check fails when a non-managed typist file remains", () => {
    const agentsDir = path.join(tempConfigHome, "opencode", "agents");
    fs.mkdirSync(agentsDir, { recursive: true });
    fs.writeFileSync(path.join(agentsDir, "typist.md"), "user-owned legacy agent");

    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);
    expect(fs.readFileSync(path.join(agentsDir, "typist.md"), "utf8")).toBe("user-owned legacy agent");

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).not.toBe(0);
    expect(check.stderr).toContain("obsolete OpenCode agent typist.md remains");

    fs.unlinkSync(path.join(agentsDir, "typist.md"));
  });

  it("apm providers check fails with empty config", () => {
    unseed();
    const result = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(result.status).not.toBe(0);
  });

  it("syncs permission config from the manifest", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, "config", "providers", "opencode.json"), "utf8"),
    ) as { permission?: Record<string, unknown> };
    expect(manifest.permission, "manifest should declare a permission block").toBeTruthy();

    const config = readOpenCodeConfig();
    expect(config.permission).toEqual(manifest.permission);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).toBe(0);
  });

  it("fails check when local permission config drifts from the manifest", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = readOpenCodeConfig();
    config.permission = { ...(config.permission as Record<string, unknown>), bash: "deny" };
    writeOpenCodeConfig(config);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).not.toBe(0);
    expect(check.stderr).toContain("permission config differs");

    // restore for subsequent tests
    const reinstall = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(reinstall.status).toBe(0);
  });

  it("syncs websearch config from the manifest", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, "config", "providers", "opencode.json"), "utf8"),
    ) as { websearch?: unknown };
    expect(manifest.websearch, "manifest should declare a websearch block").toEqual({ provider: "parallel" });

    const config = readOpenCodeConfig();
    expect(config.websearch).toEqual(manifest.websearch);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).toBe(0);
  });

  it("fails check when local websearch config drifts from the manifest", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = readOpenCodeConfig();
    config.websearch = { provider: "tavily" };
    writeOpenCodeConfig(config);

    const check = spawnSync("node", [apmCli, "providers", "check"], { encoding: "utf8" });
    expect(check.status).not.toBe(0);
    expect(check.stderr).toContain("websearch config differs");

    // restore for subsequent tests
    const reinstall = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(reinstall.status).toBe(0);
  });

  it("modalities field structure is valid per OpenCode schema", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = readOpenCodeConfig();
    const c9 = config.provider as Record<string, { models?: Record<string, { modalities?: { input: string[]; output: string[] } }> }> | undefined;
    const models = c9?.c9?.models ?? {};

    for (const [id, model] of Object.entries(models)) {
      if (model.modalities) {
        expect(Array.isArray(model.modalities.input), `${id} modalities.input must be array`).toBe(true);
        expect(Array.isArray(model.modalities.output), `${id} modalities.output must be array`).toBe(true);
        const validValues = ["text", "audio", "image", "video", "pdf"];
        for (const val of model.modalities.input) {
          expect(validValues, `${id} input value "${val}" must be valid`).toContain(val);
        }
        for (const val of model.modalities.output) {
          expect(validValues, `${id} output value "${val}" must be valid`).toContain(val);
        }
      }
    }
  });
});
