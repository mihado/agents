import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";
import { getPath, read, write } from "./opencode-config.js";

const root = path.dirname(path.dirname(path.dirname(fileURLToPath(import.meta.url))));

const tempRoot = fs.mkdtempSync(
  path.join(os.tmpdir(), "opencode-config-test-"),
);
const tempConfigHome = path.join(tempRoot, ".config");
const configPath = path.join(tempConfigHome, "opencode", "opencode.jsonc");

before(() => {
  process.env.XDG_CONFIG_HOME = tempConfigHome;
});

after(() => {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  delete process.env.XDG_CONFIG_HOME;
});

/** Writes content to the expected configPath, creating directories as needed. */
function seed(content) {
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, content);
}

function unseed() {
  try {
    fs.unlinkSync(configPath);
  } catch {
    /* ok */
  }
}

// ---------------------------------------------------------------------------
// getPath
// ---------------------------------------------------------------------------
describe("getPath()", () => {
  it("returns path under XDG_CONFIG_HOME", () => {
    assert.equal(getPath(), configPath);
  });
});

// ---------------------------------------------------------------------------
// read
// ---------------------------------------------------------------------------
describe("read()", () => {
  it("returns {} when no config file exists", () => {
    unseed();
    assert.deepEqual(read(), {});
  });

  it("parses valid JSON", () => {
    seed('{"key":"value"}');
    assert.deepEqual(read(), { key: "value" });
  });

  it("strips // single-line comments", () => {
    seed('{\n  // a comment\n  "key": "value"\n}');
    assert.deepEqual(read(), { key: "value" });
  });

  it("strips /* */ multi-line comments", () => {
    seed("{\n  /* block\n     comment */\n  \"key\": \"value\"\n}");
    assert.deepEqual(read(), { key: "value" });
  });

  it("preserves // inside strings (URLs)", () => {
    seed('{ "url": "https://example.com/path" }');
    assert.deepEqual(read(), { url: "https://example.com/path" });
  });

  it("handles // at end of line inside a string (not a comment)", () => {
    seed('{ "text": "foo // bar" }');
    assert.deepEqual(read(), { text: "foo // bar" });
  });

  it("returns {} on malformed JSON", () => {
    seed("not json");
    assert.deepEqual(read(), {});
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
    assert.ok(config.provider?.c9?.models?.["cmc/deepseek/deepseek-v4-pro"]?.reasoning);
    assert.equal(config.mcp?.context7?.type, "remote");
  });
});

// ---------------------------------------------------------------------------
// write
// ---------------------------------------------------------------------------
describe("write()", () => {
  it("creates directory and writes valid JSON", () => {
    const data = { provider: { c9: { name: "test" } } };
    write(data);
    const raw = fs.readFileSync(configPath, "utf8");
    const parsed = JSON.parse(raw);
    assert.deepEqual(parsed, data);
  });

  it("overwrites existing config", () => {
    seed('{ "old": true }');
    write({ fresh: true });
    const parsed = JSON.parse(fs.readFileSync(configPath, "utf8"));
    assert.deepEqual(parsed, { fresh: true });
  });
});

// ---------------------------------------------------------------------------
// roundtrip
// ---------------------------------------------------------------------------
describe("roundtrip", () => {
  it("preserves data through write → read", () => {
    const config = {
      provider: { c9: { models: { "cmc/deepseek": { reasoning: true } } } },
      mcp: { context7: { type: "remote", url: "https://example.com" } },
    };
    write(config);
    assert.deepEqual(read(), config);
  });

  it("write does not persist JSONC comments", () => {
    seed('{ /* will be lost */ "key": "value" }');
    const config = read();
    write(config);
    const raw = fs.readFileSync(configPath, "utf8");
    assert.ok(!raw.includes("will be lost"), "comments should be stripped");
  });
});

// ---------------------------------------------------------------------------
// integration: scripts --check against temp config
// ---------------------------------------------------------------------------
describe("integration: scripts --check", () => {
  const mcpScript = path.join(root, "scripts", "mcp");
  const providersScript = path.join(root, "scripts", "opencode-providers");

  it("mcp --check passes with a correctly seeded config", () => {
    seed(JSON.stringify({
      mcp: {
        context7: {
          type: "remote",
          url: "https://mcp.context7.com/mcp",
          headers: { CONTEXT7_API_KEY: "{env:CONTEXT7_API_KEY}" },
        },
      },
    }));
    const result = spawnSync("node", [mcpScript, "--check"], { encoding: "utf8" });
    // OpenCode section should pass; Codex/Claude depend on local tooling
    assert.match(result.stdout, /PASS\s+OpenCode\s+context7/);
  });

  it("opencode-providers --install then --check passes", () => {
    const install = spawnSync("node", [providersScript, "--install"], { encoding: "utf8" });
    assert.equal(install.status, 0);

    const check = spawnSync("node", [providersScript, "--check"], { encoding: "utf8" });
    assert.equal(check.status, 0);
    assert.match(check.stdout, /PASS\s+provider/);
  });

  it("opencode-providers --check fails with empty config", () => {
    unseed();
    const result = spawnSync("node", [providersScript, "--check"], { encoding: "utf8" });
    assert.notEqual(result.status, 0);
    assert.match(result.stderr, /FAIL\s+provider/);
  });

  it("propagates modalities for vision-capable models", () => {
    const install = spawnSync("node", [providersScript, "--install"], { encoding: "utf8" });
    assert.equal(install.status, 0);

    const config = read();
    const models = config.provider?.c9?.models;

    // Vision-capable models should have modalities with image input
    const visionModels = [
          "cmc/xiaomi/mimo-v2.5",
          "ocg/minimax-m3",
          "ocg/glm-5.2",
          "cx/gpt-5.4",
          "cx/gpt-5.4-mini",
          "cx/gpt-5.5",
          "deepseek-v4-pro-fusion",
          "deepseek-v4-flash-fusion",
          "glm-5.2-fusion",
        ];
    for (const id of visionModels) {
      assert.ok(models[id], `model ${id} should exist`);
      assert.deepEqual(models[id].modalities, {
        input: ["text", "image"],
        output: ["text"],
      }, `${id} should have image modality`);
    }

    // Text-only models should NOT have modalities
    const textOnlyModels = [
          "cmc/deepseek/deepseek-v4-pro",
          "cmc/deepseek/deepseek-v4-flash",
          "cmc/xiaomi/mimo-v2.5-pro",
        ];
    for (const id of textOnlyModels) {
      assert.ok(models[id], `model ${id} should exist`);
      assert.equal(models[id].modalities, undefined, `${id} should not have modalities`);
    }
  });

  it("propagates tool_call and temperature for all models", () => {
    const install = spawnSync("node", [providersScript, "--install"], { encoding: "utf8" });
    assert.equal(install.status, 0);

    const config = read();
    const models = config.provider?.c9?.models;
    const allIds = Object.keys(models);
    assert.ok(allIds.length >= 9, "should have at least 9 models");

    for (const id of allIds) {
      assert.equal(models[id].tool_call, true, `${id} should have tool_call: true`);
      assert.equal(models[id].temperature, true, `${id} should have temperature: true`);
    }
  });

  it("modalities field structure is valid per OpenCode schema", () => {
    const install = spawnSync("node", [providersScript, "--install"], { encoding: "utf8" });
    assert.equal(install.status, 0);

    const config = read();
    const models = config.provider?.c9?.models;

    for (const [id, model] of Object.entries(models)) {
      if (model.modalities) {
        // Must have input and output arrays
        assert.ok(Array.isArray(model.modalities.input), `${id} modalities.input must be array`);
        assert.ok(Array.isArray(model.modalities.output), `${id} modalities.output must be array`);
        // Only valid enum values
        const validValues = ["text", "audio", "image", "video", "pdf"];
        for (const val of model.modalities.input) {
          assert.ok(validValues.includes(val), `${id} input value "${val}" must be valid`);
        }
        for (const val of model.modalities.output) {
          assert.ok(validValues.includes(val), `${id} output value "${val}" must be valid`);
        }
      }
    }
  });
});
