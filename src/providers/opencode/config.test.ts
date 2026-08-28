import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { spawnSync, execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { getPath, read, write } from "./config.js";

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

describe("getPath()", () => {
  it("returns path under XDG_CONFIG_HOME", () => {
    expect(getPath()).toBe(configPath);
  });
});

describe("read()", () => {
  it("returns {} when no config file exists", () => {
    unseed();
    expect(read()).toEqual({});
  });

  it("parses valid JSON", () => {
    seed('{"key":"value"}');
    expect(read()).toEqual({ key: "value" });
  });

  it("strips // single-line comments", () => {
    seed('{\n  // a comment\n  "key": "value"\n}');
    expect(read()).toEqual({ key: "value" });
  });

  it("strips /* */ multi-line comments", () => {
    seed("{\n  /* block\n     comment */\n  \"key\": \"value\"\n}");
    expect(read()).toEqual({ key: "value" });
  });

  it("preserves // inside strings (URLs)", () => {
    seed('{ "url": "https://example.com/path" }');
    expect(read()).toEqual({ url: "https://example.com/path" });
  });

  it("handles // at end of line inside a string (not a comment)", () => {
    seed('{ "text": "foo // bar" }');
    expect(read()).toEqual({ text: "foo // bar" });
  });

  it("returns {} on malformed JSON", () => {
    seed("not json");
    expect(read()).toEqual({});
  });

  it("reads the real-world provider + mcp config shape", () => {
    seed(`{
  "provider": {
    "c9": {
      "name": "c9.rter.cc",
      "options": { "baseURL": "https://c9.rter.cc/v1" },
      "models": {
        "cmc/deepseek/deepseek-v4-pro": {
          "name": "DeepSeek V4 Pro",
          "reasoning": true,
          "limit": { "context": 1000000, "output": 384000 }
        }
      }
    }
  },
  "mcp": {
    "context7": {
      "type": "remote",
      "url": "https://mcp.context7.com/mcp",
      "headers": { "CONTEXT7_API_KEY": "{env:CONTEXT7_API_KEY}" }
    }
  }
}`);
    const config = read();
    const c9 = config.provider as Record<string, unknown> | undefined;
    const c9models = c9?.c9 as Record<string, unknown> | undefined;
    const models = c9models?.models as Record<string, { reasoning?: boolean }> | undefined;
    expect(models?.["cmc/deepseek/deepseek-v4-pro"]?.reasoning).toBe(true);
    const mcp = config.mcp as Record<string, { type?: string }> | undefined;
    expect(mcp?.context7?.type).toBe("remote");
  });
});

describe("write()", () => {
  it("creates directory and writes valid JSON", () => {
    const data = { provider: { c9: { name: "test" } } };
    write(data);
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    expect(parsed).toEqual(data);
  });

  it("overwrites existing config", () => {
    seed('{ "old": true }');
    write({ fresh: true });
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
    write(config);
    expect(read()).toEqual(config);
  });

  it("write does not persist JSONC comments", () => {
    seed('{ /* will be lost */ "key": "value" }');
    const config = read();
    write(config);
    const raw = fs.readFileSync(configPath, "utf8");
    expect(raw).not.toContain("will be lost");
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

  it("propagates modalities for vision-capable models", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = read();
    const c9 = config.provider as Record<string, { models?: Record<string, Record<string, unknown>> }> | undefined;
    const models = c9?.c9?.models ?? {};

    // Derived from the source manifest so every image-input model stays covered
    // as models are added or renamed.
    const manifest = JSON.parse(
      fs.readFileSync(path.join(root, "config", "providers", "opencode.json"), "utf8"),
    ) as Record<string, { models?: Record<string, { modalities?: { input?: string[] } }> }>;
    const visionModels = Object.entries(manifest.c9?.models ?? {})
      .filter(([, model]) => model.modalities?.input?.includes("image"))
      .map(([id]) => id);
    expect(visionModels.length, "manifest should contain vision-capable models").toBeGreaterThan(0);
    for (const id of visionModels) {
      expect(models[id], `model ${id} should exist`).toBeTruthy();
      expect((models[id] as Record<string, { input: string[]; output: string[] }>).modalities).toEqual({
        input: ["text", "image"],
        output: ["text"],
      });
    }

    const textOnlyModels = ["cmc-ds-v4-pro-fusion"];
    for (const id of textOnlyModels) {
      expect(models[id], `model ${id} should exist`).toBeTruthy();
      expect((models[id] as Record<string, unknown>).modalities, `${id} should not have modalities`).toBeUndefined();
    }
  });

  it("propagates tool_call and temperature for all models", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = read();
    const c9 = config.provider as Record<string, { models?: Record<string, Record<string, unknown>> }> | undefined;
    const models = c9?.c9?.models ?? {};
    const allIds = Object.keys(models);
    expect(allIds.length).toBeGreaterThanOrEqual(9);

    for (const id of allIds) {
      expect((models[id] as Record<string, unknown>).tool_call, `${id} should have tool_call: true`).toBe(true);
      expect((models[id] as Record<string, unknown>).temperature, `${id} should have temperature: true`).toBe(true);
    }
  });

  it("modalities field structure is valid per OpenCode schema", () => {
    const install = spawnSync("node", [apmCli, "providers", "install"], { encoding: "utf8" });
    expect(install.status).toBe(0);

    const config = read();
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
