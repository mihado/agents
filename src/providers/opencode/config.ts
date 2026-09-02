import fs from "node:fs";
import path from "node:path";
import { readJson, fail } from "../../core/commands.js";
import { getConfigHome } from "../../core/paths.js";
import { resolveExecutable } from "../../core/commands.js";
import type { ProviderManifest, ProviderManifestEntry } from "../types.js";

export function getOpenCodeConfigPath(): string {
  return path.join(getConfigHome(), "opencode", "opencode.jsonc");
}

export function readOpenCodeConfig(): Record<string, unknown> {
  const configPath = getOpenCodeConfigPath();
  if (!fs.existsSync(configPath)) return {};
  try {
    return parseJSONC(fs.readFileSync(configPath, "utf8"));
  } catch {
    return {};
  }
}

export function writeOpenCodeConfig(config: Record<string, unknown>): void {
  const configPath = getOpenCodeConfigPath();
  fs.mkdirSync(path.dirname(configPath), { recursive: true });
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + "\n");
}

function parseJSONC(content: string): Record<string, unknown> {
  let result = "";
  let inString = false;
  let inLineComment = false;
  let inBlockComment = false;

  for (let i = 0; i < content.length; i++) {
    const ch = content[i];
    const next = content[i + 1];

    if (inLineComment) {
      if (ch === "\n") {
        inLineComment = false;
        result += ch;
      }
      continue;
    }

    if (inBlockComment) {
      if (ch === "*" && next === "/") {
        inBlockComment = false;
        i++;
      }
      continue;
    }

    if (inString) {
      result += ch;
      if (ch === "\\" && next !== undefined) {
        result += next;
        i++;
        continue;
      }
      if (ch === '"') inString = false;
      continue;
    }

    if (ch === '"') {
      inString = true;
      result += ch;
      continue;
    }
    if (ch === "/" && next === "/") {
      inLineComment = true;
      i++;
      continue;
    }
    if (ch === "/" && next === "*") {
      inBlockComment = true;
      i++;
      continue;
    }
    result += ch;
  }

  return JSON.parse(result);
}

export interface McpServerDef {
  type: string;
  command: string;
  args: string[];
  env?: string[];
}

export interface McpManifest {
  version: number;
  servers: Record<string, McpServerDef>;
}

export function loadMcpManifest(root: string): McpManifest {
  const manifestPath = path.join(root, "config", "providers", "mcp.json");
  const manifest = readJson<McpManifest>(manifestPath);
  validateMcpManifest(manifest);
  return manifest;
}

function validateMcpManifest(manifest: McpManifest): void {
  if (manifest.version !== 1) fail("mcp.json version must be 1");
  if (!isObject(manifest.servers) || Object.keys(manifest.servers).length === 0) {
    fail("mcp.json must contain at least one server");
  }

  for (const [name, server] of Object.entries(manifest.servers)) {
    if (
      !name ||
      server.type !== "stdio" ||
      typeof server.command !== "string" || !server.command ||
      !Array.isArray(server.args) ||
      !server.args.every((arg) => typeof arg === "string") ||
      !Array.isArray(server.env || []) ||
      !(server.env || []).every((key) => typeof key === "string")
    ) {
      fail(`invalid MCP server definition: ${name}`);
    }
  }
}

export function resolveTools(): { codex: string | null; claude: string | null; opencode: string | null } {
  return {
    codex: resolveExecutable(process.env.CODEX_CLI_PATH, "codex", "/Applications/Codex.app/Contents/Resources/codex"),
    claude: resolveExecutable(process.env.CLAUDE_CLI_PATH, "claude"),
    opencode: resolveExecutable(process.env.OPENCODE_CLI_PATH, "opencode"),
  };
}

export function toOpenCodeRemote(server: McpServerDef): { type: string; url: string; headers: Record<string, string> } | null {
  if (server.command === "npx" && server.args.includes("@upstash/context7-mcp")) {
    return {
      type: "remote",
      url: "https://mcp.context7.com/mcp",
      headers: server.env?.includes("CONTEXT7_API_KEY")
        ? { CONTEXT7_API_KEY: "{env:CONTEXT7_API_KEY}" }
        : {},
    };
  }
  return null;
}

export function installOpenCodeMcp(name: string, server: McpServerDef, config: Record<string, unknown>): boolean {
  const expected = toOpenCodeRemote(server);
  if (!expected) {
    console.error(`error   ${name} cannot be configured for OpenCode (no remote mapping)`);
    return false;
  }

  const mcpSection = (config.mcp ?? {}) as Record<string, unknown>;
  const current = mcpSection[name] as Record<string, unknown> | undefined;

  if (current && JSON.stringify(current) === JSON.stringify(expected)) {
    console.log(`ok      OpenCode ${name}`);
    return false;
  }

  mcpSection[name] = expected;
  config.mcp = mcpSection;
  console.log(`linked  OpenCode ${name}`);
  return true;
}

export function checkOpenCodeMcp(name: string, server: McpServerDef): boolean {
  const config = readOpenCodeConfig();
  const current = (config.mcp as Record<string, unknown>)?.[name];
  if (!current) {
    console.error(`FAIL  OpenCode ${name} is not configured`);
    return false;
  }
  const expected = toOpenCodeRemote(server);
  if (!expected) {
    console.error(`FAIL  OpenCode ${name} unsupported`);
    return false;
  }
  if (
    (current as Record<string, unknown>).type === expected.type &&
    (current as Record<string, unknown>).url === expected.url &&
    JSON.stringify((current as Record<string, unknown>).headers || {}) === JSON.stringify(expected.headers || {})
  ) {
    console.log(`PASS  OpenCode ${name} configured`);
    return true;
  }
  console.error(`FAIL  OpenCode ${name} configuration conflicts`);
  return false;
}

export function loadProviderManifest(root: string): ProviderManifest {
  const manifestPath = path.join(root, "config", "providers", "opencode.json");
  const manifest = readJson<ProviderManifest>(manifestPath);
  validateProviderManifest(manifest);
  return manifest;
}

function validateProviderManifest(manifest: ProviderManifest): void {
  if (!isObject(manifest.provider) || Object.keys(manifest.provider).length === 0) {
    fail("providers.json must contain at least one provider");
  }
  if (manifest.plugin !== undefined && (!Array.isArray(manifest.plugin) || !manifest.plugin.every((plugin) => typeof plugin === "string" && plugin))) {
    fail("providers.json plugin must be an array of non-empty strings");
  }
  if (manifest.permission !== undefined && !isObject(manifest.permission)) {
    fail("providers.json permission must be an object");
  }

  for (const [id, def] of Object.entries(manifest.provider)) {
    if (!id || typeof def !== "object") {
      fail(`providers.json: "${id}" must be an object`);
    }
    if (!def.baseURL || typeof def.baseURL !== "string") {
      fail(`providers.json: "${id}" must have a "baseURL" string`);
    }
    if (!def.models || Object.keys(def.models).length === 0) {
      fail(`providers.json: "${id}" must have at least one model`);
    }
    for (const [modelId, model] of Object.entries(def.models)) {
      if (typeof model.name !== "string" || !model.name) {
        fail(`providers.json: "${id}" model "${modelId}" must have a "name" string`);
      }
    }
  }
}

export function toOpenCodeProvider(providerId: string, def: ProviderManifestEntry): Record<string, unknown> {
  return {
    npm: def.npm || "@ai-sdk/openai-compatible",
    name: def.name || providerId,
    options: {
      baseURL: def.baseURL,
      ...(def.apiKeyEnv ? { apiKey: `{env:${def.apiKeyEnv}}` } : (def.apiKey ? { apiKey: def.apiKey } : {})),
    },
    models: Object.fromEntries(
      Object.entries(def.models || {}).map(([modelId, model]) => [
        modelId,
        {
          name: model.name || modelId,
          ...(model.reasoning !== undefined ? { reasoning: model.reasoning } : {}),
          ...(model.tool_call !== undefined ? { tool_call: model.tool_call } : {}),
          ...(model.temperature !== undefined ? { temperature: model.temperature } : {}),
          ...(model.limit ? { limit: model.limit } : {}),
          ...(model.modalities ? { modalities: model.modalities } : {}),
        },
      ]),
    ),
  };
}

export function checkProviders(root: string): boolean {
  const manifest = loadProviderManifest(root);
  const config = readOpenCodeConfig();
  let failures = 0;

  for (const [providerId, def] of Object.entries(manifest.provider)) {
    const expected = toOpenCodeProvider(providerId, def);
    const current = (config.provider as Record<string, unknown>)?.[providerId];
    if (!current) {
      console.error(`FAIL  provider ${providerId} not configured (config: ${getOpenCodeConfigPath()})`);
      failures++;
    } else if (JSON.stringify(current) === JSON.stringify(expected)) {
      console.log(`PASS  provider ${providerId} configured`);
    } else {
      console.error(`FAIL  provider ${providerId} config differs from providers.json`);
      failures++;
    }
  }

  const expectedPlugins = manifest.plugin ?? [];
  const configuredPlugins = Array.isArray(config.plugin) ? config.plugin : [];
  for (const plugin of expectedPlugins) {
    if (!configuredPlugins.includes(plugin)) {
      console.error(`FAIL  plugin ${plugin} not configured`);
      failures++;
    }
  }

  if (manifest.permission) {
    if (JSON.stringify(config.permission) === JSON.stringify(manifest.permission)) {
      console.log("PASS  permission config");
    } else {
      console.error(`FAIL  permission config differs from providers.json (config: ${getOpenCodeConfigPath()})`);
      failures++;
    }
  }

  return failures === 0;
}

export function installProviders(root: string): void {
  const manifest = loadProviderManifest(root);
  const config = readOpenCodeConfig();
  if (!config.provider) config.provider = {};

  let changed = false;
  const failures = 0;

  for (const [providerId, def] of Object.entries(manifest.provider)) {
    const expected = toOpenCodeProvider(providerId, def);
    const current = (config.provider as Record<string, unknown>)[providerId];
    if (current && JSON.stringify(current) === JSON.stringify(expected)) {
      console.log(`ok      provider ${providerId}`);
      continue;
    }
    (config.provider as Record<string, unknown>)[providerId] = expected;
    changed = true;
    console.log(`linked  provider ${providerId}`);
  }

  const expectedPlugins = manifest.plugin ?? [];
  const configuredPlugins = Array.isArray(config.plugin) ? config.plugin : [];
  const plugins = [...new Set([...configuredPlugins, ...expectedPlugins])];
  if (plugins.length > 0 && JSON.stringify(configuredPlugins) !== JSON.stringify(plugins)) {
    config.plugin = plugins;
    changed = true;
    console.log(`linked  plugin ${expectedPlugins.join(", ")}`);
  }

  if (manifest.permission && JSON.stringify(config.permission) !== JSON.stringify(manifest.permission)) {
    config.permission = manifest.permission;
    changed = true;
    console.log("linked  permission config");
  }

  if (changed && failures === 0) {
    writeOpenCodeConfig(config);
    console.log(`wrote: ${getOpenCodeConfigPath()}`);
  }

  if (failures > 0) process.exit(1);
}

function isObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export {
  getOpenCodeConfigPath as getPath,
  readOpenCodeConfig as read,
  writeOpenCodeConfig as write,
};
