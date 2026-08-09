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

  it("keeps workflow agents as thin wrappers around deterministic skills", () => {
    const agentDir = path.join(root, "config", "providers", "opencode", "agents");
    const skillDir = path.join(root, ".agents", "skills", "workflow");
    const wrappers: Record<string, string[]> = {
      "planner.md": ["Required skill:", "[EXECUTION-PLANNING MODE]`: `wf-planning` with `Mode: execution`", "[RESEARCH MODE]`: `wf-research` with `Mode: research`"],
      "planner-adversarial.md": ["Required skill:", "[EXECUTION-PLANNING MODE]`: `wf-planning` with `Mode: adversarial`", "[RESEARCH MODE]`: `wf-research` with `Mode: adversarial`"],
      "operator.md": ["Required skill:", "`wf-execution`"],
      "verifier.md": ["Required skill:", "`wf-verification`"],
      "reviewer.md": ["wf-review", "standards-spec"],
      "reviewer-adversarial.md": ["wf-review", "adversarial-risk"],
      "judge.md": ["Required skill:", "`wf-judge`"],
    };

    for (const [agent, requiredMarkers] of Object.entries(wrappers)) {
      const content = fs.readFileSync(path.join(agentDir, agent), "utf8");
      for (const marker of requiredMarkers) expect(content).toContain(marker);
    }

    for (const skill of ["wf-conductor", "wf-planning", "wf-research", "wf-execution", "wf-verification", "wf-review", "wf-judge"]) {
      const content = fs.readFileSync(path.join(skillDir, skill, "SKILL.md"), "utf8");
      expect(content).toContain(`name: ${skill}`);
    }

    const conductor = fs.readFileSync(path.join(agentDir, "conductor.md"), "utf8");
    expect(conductor).toContain("installed `wf-conductor` skill");
    expect(conductor).not.toContain(".agents/skills/workflow/");
    for (const reviewer of ["reviewer.md", "reviewer-adversarial.md"]) {
      const content = fs.readFileSync(path.join(agentDir, reviewer), "utf8");
      expect(content).toContain("installed `wf-review` skill");
      expect(content).not.toContain(".agents/skills/workflow/");
    }

    for (const reference of ["recovery.md", "think.md", "plan.md", "act.md", "verify.md", "review.md"]) {
      expect(fs.existsSync(path.join(skillDir, "wf-conductor", "references", reference))).toBe(true);
    }

    const planReference = fs.readFileSync(path.join(skillDir, "wf-conductor", "references", "plan.md"), "utf8");
    expect(planReference).toContain("configured `planner`");
    expect(planReference).toContain("configured `planner-adversarial`");
    expect(planReference).toContain("Do not substitute a generic worker");
    expect(planReference).toContain("Research is complete only when both named-worker reports and the judge synthesis are persisted.");
    const conductorReferences: Array<[string, string[]]> = [
      ["act.md", ["configured `operator`", "configured `verifier`"]],
      ["verify.md", ["configured `verifier`"]],
      ["review.md", ["configured `reviewer` and `reviewer-adversarial`", "configured `judge`"]],
    ];
    for (const [reference, markers] of conductorReferences) {
      const content = fs.readFileSync(path.join(skillDir, "wf-conductor", "references", reference), "utf8");
      for (const marker of markers) expect(content).toContain(marker);
    }
    expect(fs.readFileSync(path.join(skillDir, "wf-conductor", "SKILL.md"), "utf8")).toContain("Do not substitute a generic worker");
    for (const agent of ["planner.md", "planner-adversarial.md", "operator.md", "verifier.md", "reviewer.md", "reviewer-adversarial.md", "judge.md"]) {
      expect(fs.existsSync(path.join(agentDir, agent))).toBe(true);
    }
  });

  it("keeps stable lane authority and lane-local practice maps limited to installed disciplines", () => {
    const allSkillsDir = path.join(root, ".agents", "skills");
    const conductorPath = path.join(root, ".agents", "skills", "workflow", "wf-conductor", "SKILL.md");
    const conductorContract = fs.readFileSync(conductorPath, "utf8");
    const expectedSkills: Array<[string, string]> = [
      ["interview-me", "engineering"], ["idea-refine", "engineering"], ["wayfinder", "engineering"],
      ["source-driven-development", "engineering"], ["spec-driven-development", "engineering"],
      ["api-and-interface-design", "engineering"], ["domain-modeling", "engineering"],
      ["security-and-hardening", "engineering"], ["deprecation-and-migration", "engineering"],
      ["ci-cd-and-automation", "engineering"], ["frontend-ui-engineering", "engineering"],
      ["test-driven-development", "engineering"], ["incremental-implementation", "engineering"],
      ["debugging-and-error-recovery", "engineering"], ["performance-optimization", "engineering"],
      ["browser-testing-with-devtools", "engineering"], ["code-review-and-quality", "engineering"],
      ["shipping-and-launch", "engineering"], ["observability-and-instrumentation", "engineering"],
      ["git-workflow-and-versioning", "engineering"], ["hallmark", "design"], ["impeccable", "design"],
    ];

    for (const [skill, category] of expectedSkills) {
      expect(fs.existsSync(path.join(allSkillsDir, category, skill, "SKILL.md"))).toBe(true);
    }
    expect(conductorContract).not.toContain("`api-and-interface-design`");
    expect(conductorContract).not.toContain("`browser-testing-with-devtools`");
    expect(conductorContract).not.toContain("`code-review-and-quality`");
    expect(conductorContract).toContain("required evidence returns to the owner");
    expect(conductorContract).toContain("`INCOMPLETE`");

    const localMaps: Array<[string, string[]]> = [
      ["wf-planning", ["api-and-interface-design", "domain-modeling", "security-and-hardening", "deprecation-and-migration", "ci-cd-and-automation", "frontend-ui-engineering", "hallmark", "impeccable"]],
      ["wf-research", ["source-driven-development"]],
      ["wf-execution", ["source-driven-development", "test-driven-development", "incremental-implementation", "browser-testing-with-devtools"]],
      ["wf-verification", ["browser-testing-with-devtools"]],
      ["wf-review", ["code-review-and-quality"]],
    ];

    for (const [owner, skills] of localMaps) {
      const content = fs.readFileSync(path.join(allSkillsDir, "workflow", owner, "SKILL.md"), "utf8");
      for (const skill of skills) expect(content).toContain(`\`${skill}\``);
    }
    expect(fs.readFileSync(path.join(allSkillsDir, "workflow", "wf-planning", "SKILL.md"), "utf8")).toContain("**adversarial:**");
    expect(fs.readFileSync(path.join(allSkillsDir, "workflow", "wf-review", "SKILL.md"), "utf8")).toContain("**adversarial-risk:**");
    for (const reference of ["research.md", "adversarial.md"]) {
      expect(fs.existsSync(path.join(allSkillsDir, "workflow", "wf-research", "references", reference))).toBe(true);
    }
  });

  it("documents every routed skill in the portable workflow catalog", () => {
    const workflowPath = path.join(root, "docs", "provider-workflow.md");
    const workflow = fs.readFileSync(workflowPath, "utf8");
    const catalogStart = workflow.indexOf("## Workflow Kernel and Practices");
    const catalogEnd = workflow.indexOf("## Decisions, Evidence, and Artifacts");
    expect(catalogStart).toBeGreaterThanOrEqual(0);
    expect(catalogEnd).toBeGreaterThan(catalogStart);

    const catalog = workflow.slice(catalogStart, catalogEnd);
    const conductorPath = path.join(root, ".agents", "skills", "workflow", "wf-conductor", "SKILL.md");
    const conductorContract = fs.readFileSync(conductorPath, "utf8");
    const routedSkills = [...conductorContract.matchAll(/`(wf-[a-z][a-z0-9-]+)`/g)].map((match) => match[1]);

    for (const skill of new Set(routedSkills)) {
      expect(catalog).toContain(`\`${skill}\``);
    }
  });

  it("keeps durable workflow artifacts scoped to one active human-selected work", () => {
    const conductor = fs.readFileSync(path.join(root, ".agents", "skills", "workflow", "wf-conductor", "SKILL.md"), "utf8");
    for (const marker of ["human-selected coherent objective", "user alone selects a new work", "must not split, switch, or abandon work automatically", "wf-artifact/v1", "STALE"]) {
      expect(conductor).toContain(marker);
    }

    const referencesDir = path.join(root, ".agents", "skills", "workflow", "wf-conductor", "references");
    const expectedReferenceMarkers: Array<[string, string]> = [
      ["think.md", ".agent-contexts/work/<work-id>/brief.md"],
      ["plan.md", ".agent-contexts/work/<work-id>/plans/plan-<n>.md"],
      ["act.md", ".agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md"],
      ["verify.md", ".agent-contexts/work/<work-id>/execution/attempt-<n>/verify.md"],
      ["review.md", ".agent-contexts/work/<work-id>/execution/attempt-<n>/review.md"],
      ["recovery.md", ".agent-contexts/active.md"],
    ];
    for (const [reference, marker] of expectedReferenceMarkers) {
      expect(fs.readFileSync(path.join(referencesDir, reference), "utf8")).toContain(marker);
    }

    const workflow = fs.readFileSync(path.join(root, "docs", "provider-workflow.md"), "utf8");
    for (const marker of [".agent-contexts/active.md", "<work-id>/", "research-<n>/", "plan-<n>.md", "attempt-<n>/", "wf-artifact/v1", "user alone starts, selects, completes, or abandons work", "must not split, switch, or abandon work automatically", "Operator → Verify → Review", "repair-in-scope"]) {
      expect(workflow).toContain(marker);
    }

    const execution = fs.readFileSync(path.join(root, ".agents", "skills", "workflow", "wf-execution", "SKILL.md"), "utf8");
    expect(execution).toContain("## Operator Result");
    expect(execution).toContain("Do not create a default handoff artifact");
    expect(execution).not.toContain("## Operator Handoff");

    const operator = fs.readFileSync(path.join(root, "config", "providers", "opencode", "agents", "operator.md"), "utf8");
    expect(operator).toContain("Operator Result");
    expect(operator).not.toContain("Operator Handoff");

    const verification = fs.readFileSync(path.join(root, ".agents", "skills", "workflow", "wf-verification", "SKILL.md"), "utf8");
    expect(verification).not.toContain("operator handoff");

    const review = fs.readFileSync(path.join(root, ".agents", "skills", "workflow", "wf-review", "SKILL.md"), "utf8");
    for (const disposition of ["no-actionable-findings", "repair-in-scope", "replan-required", "human-decision-required"]) {
      expect(review).toContain(disposition);
    }

    const judge = fs.readFileSync(path.join(root, ".agents", "skills", "workflow", "wf-judge", "SKILL.md"), "utf8");
    expect(judge).toContain("[REVIEW SYNTHESIS]");
    expect(judge).toContain("Choose the most conservative disposition");
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

    const visionModels = [
      "ocg/mimo-v2.5", "ocg/glm-5.2", "cx/gpt-5.4", "cx/gpt-5.4-mini",
      "cx/gpt-5.5", "minimax-m3", "deepseek-v4-pro-fusion", "deepseek-v4-flash-fusion", "glm-5.2-fusion",
    ];
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
