import { agents } from "./agents.js";
import { codex } from "./codex.js";
import { claude } from "./claude.js";
import { opencode } from "./opencode/index.js";
import { kiro } from "./kiro.js";
import type { Provider } from "./types.js";

export const registry: Provider[] = [agents, codex, claude, opencode, kiro];
