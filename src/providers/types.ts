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
  baseURL: string;
  name?: string;
  npm?: string;
  apiKeyEnv?: string;
  apiKey?: string;
  models: Record<string, ProviderManifestModel>;
}

export interface ProviderManifest {
  plugin?: string[];
  provider: Record<string, ProviderManifestEntry>;
}
