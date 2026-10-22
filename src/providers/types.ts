export interface Provider {
  name: string;
  install(root: string): boolean;
  check(root: string): boolean;
}

export interface ProviderManifestModel {
  name?: string;
  reasoning?: boolean;
  tool_call?: boolean;
  temperature?: boolean;
  limit?: { context: number; output: number };
  modalities?: { input: string[]; output: string[] };
}

export interface ProviderManifestEntry {
  baseURL?: string;
  name?: string;
  npm?: string;
  apiKeyEnv?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  models?: Record<string, ProviderManifestModel>;
  // Overlay for a built-in (Models.dev) provider: synced verbatim under the
  // provider id. Lets repo config set options (e.g. headers) on providers
  // OpenCode already knows without redeclaring baseURL/models.
  options?: Record<string, unknown>;
}

export interface ProviderManifest {
  plugins?: string[];
  provider: Record<string, ProviderManifestEntry>;
  permission?: Record<string, unknown>;
  websearch?: { provider: string } | false;
}
